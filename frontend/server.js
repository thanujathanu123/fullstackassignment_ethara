import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

const distPath = path.join(__dirname, 'dist');

app.use(express.static(distPath));

app.use((req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(503).send('Service Unavailable: Frontend build is missing.');
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Express static server listening on 0.0.0.0:${port}`);
});
