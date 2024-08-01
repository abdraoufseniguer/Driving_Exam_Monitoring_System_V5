const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.static('public'));

// Route to serve models
app.use('/models', express.static(path.join(__dirname, 'public', 'models')));

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});