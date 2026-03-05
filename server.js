const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;

const providers = {};
const providerFiles = [
    'isaidub', 'movies4u', 'tamilmv', 'tamilblasters', 'tamilian',
    'moviesda', 'toonhub', 'animelok', 'xdmovies', 'dramafull'
];

for (const name of providerFiles) {
    try {
        const providerPath = path.join(__dirname, 'src', 'providers', `${name}.js`);
        if (fs.existsSync(providerPath)) {
            providers[name] = require(providerPath);
            console.log(`Loaded provider: ${name}`);
        }
    } catch (e) {
        console.error(`Failed to load provider ${name}:`, e.message);
    }
}

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const mimeTypes = {
    '.json': 'application/json',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.html': 'text/html',
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const apiMatch = req.url.match(/^\/api\/(\w+)(?:\/(.+))?$/);
    if (apiMatch) {
        const [, action, param] = apiMatch;
        
        if (action === 'providers') {
            const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf-8'));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(manifest.scrapers.filter(p => p.enabled)));
            return;
        }
        
        if (action === 'streams') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const query = param ? decodeURIComponent(param) : body;
                    const params = new URLSearchParams(query);
                    const providerId = params.get('provider');
                    const tmdbId = params.get('tmdbId') || params.get('id');
                    const mediaType = params.get('mediaType') || params.get('type') || 'movie';
                    const season = params.get('season');
                    const episode = params.get('episode');
                    
                    if (!tmdbId) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Missing tmdbId parameter' }));
                        return;
                    }
                    
                    if (providerId && providers[providerId]) {
                        const streams = await providers[providerId].getStreams(tmdbId, mediaType, season, episode);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ provider: providerId, streams }));
                    } else if (!providerId) {
                        const allResults = await Promise.all(
                            Object.keys(providers).map(async (pid) => {
                                try {
                                    const streams = await providers[pid].getStreams(tmdbId, mediaType, season, episode);
                                    return { provider: pid, streams };
                                } catch (e) {
                                    return { provider: pid, streams: [], error: e.message };
                                }
                            })
                        );
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ results: allResults }));
                    } else {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Provider not found' }));
                    }
                } catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: e.message }));
                }
            });
            return;
        }
        
        res.writeHead(404);
        res.end('API endpoint not found');
        return;
    }

    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov'];
    const extname = path.extname(filePath);
    let contentType = mimeTypes[extname] || 'application/octet-stream';
    if (videoExtensions.includes(extname)) {
        contentType = "video/mp4";
    }

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                if (req.url === '/') {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end('Nuvio Providers Server Running. Access /manifest.json or /api/providers');
                    return;
                }
                res.writeHead(404);
                res.end(`File not found: ${req.url}`);
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    const ip = getLocalIp();
    console.log(`\n🚀 Server running at: http://${ip}:${PORT}/`);
    console.log(`📝 Manifest URL:      http://${ip}:${PORT}/manifest.json`);
    console.log('Press Ctrl+C to stop\n');
});
