class Release {
    constructor(artists, title, labels, styles) {
        this.artists = artists;
        this.title = title;
        this.labels = labels;
        this.styles = styles;
    }

    toYAML() {
        return `---
        artists: ${this.artists.map(artist => `- "${artist}"`).join('\n')}
        title: "${this.title}"
        labels: ${this.labels.map(label => `- "${label}"`).join('\n')}
        styles: ${this.styles.map(style => `- "${style}"`).join('\n')}
        ---`;
    }
}

module.exports = Release;