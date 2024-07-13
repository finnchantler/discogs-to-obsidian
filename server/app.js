const express = require('express');
const Discogs = require('disconnect').Client;
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const Release = require('./releaseModel');
const archiver = require('archiver');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Discogs -> Obsidian</title>
      </head>
      <body>
      <p>make sure your collection isn't set to private</p>
        <form action="/go" method="POST">
          <label for="username">Discogs username:</label>
          <input type="text" id="username" name="username" required>
          <button type="submit">Go</button>
        </form>
      </body>
    </html>
  `);
  
})

app.post('/go', async (req, res) => {
  const username = req.body.username;
  const releasesArray = [];
  let currentPage = 1;
  let totalPages = 1;
  const collection = new Discogs().user().collection();

  try {
    do {
      const data = await new Promise((resolve, reject) => {
        collection.getReleases(username, 0, { page: currentPage, per_page: 100 }, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });

      totalPages = data.pagination.pages;

      for (let release of data.releases) {
        const artists = release.basic_information.artists.map(artist => artist.name);
        const title = release.basic_information.title;
        const labels = release.basic_information.labels.map(label => label.name);
        const styles = release.basic_information.styles;

        // Create 

        const r = new Release(artists, title, labels, styles);
        releasesArray.push(r);
      }

      currentPage++;

    } while (currentPage <= totalPages);

    // Generate Obsidian vault structure
    const vaultPath = path.join(__dirname, 'obsidian-vault');
    if (!fs.existsSync(vaultPath)) {
      fs.mkdirSync(vaultPath);
    }

    for (const release of releasesArray) {
      const releaseDir = path.join(vaultPath, release.title);
      if (!fs.existsSync(releaseDir)) {
        fs.mkdirSync(releaseDir);
      }

      const markdownContent = `
---
title: "${release.title}"
artists: [${release.artists.map(artist => `"${artist}"`).join(', ')}]
labels: [${release.labels.map(label => `"${label}"`).join(', ')}]
styles: [${release.styles.map(style => `"${style}"`).join(', ')}]
---

# ${release.title}
## Artists
${release.artists.join(', ')}
## Labels
${release.labels.join(', ')}
## Styles
${release.styles.join(', ')}
    `;

      fs.writeFileSync(path.join(releaseDir, `${release.title}.md`), markdownContent.trim());
    }

    // Create the Home.md file with Dataview query
    const homeContent = `


## Releases
\`\`\`dataview
table title, artists, labels, styles
from ""
where file.name != "Home.md"
\`\`\`
    `;

    fs.writeFileSync(path.join(vaultPath, 'Home.md'), homeContent.trim());

    // Create a zip file of the vault
    const zipPath = path.join(__dirname, 'obsidian-vault.zip');
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level.
    });

    output.on('close', () => {
      console.log(`${archive.pointer()} total bytes`);
      console.log('Archiver has been finalized and the output file descriptor has closed.');
      res.download(zipPath);
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);
    archive.directory(vaultPath, false);
    archive.finalize();

  } catch (error) {
    console.error('Error fetching releases:', error);
    res.status(500).send('Error fetching releases');
  }
});


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})