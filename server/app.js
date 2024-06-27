const express = require('express');
const Discogs = require('disconnect').Client;
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const Release = require('./releaseModel');

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

        const r = new Release(artists, title, labels, styles);
        releasesArray.push(r);
      }

      currentPage++;

    } while (currentPage <= totalPages);

    console.log(releasesArray); // This should now log the populated releasesArray

    res.status(200).json({ releases: releasesArray });

  } catch (error) {
    console.error('Error fetching releases:', error);
    res.status(500).send('Error fetching releases');
  }
});


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})