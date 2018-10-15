const express = require('express');
const app = express();
const WebTorrent = require('webtorrent')
const client = new WebTorrent()
const path = require('path');

app.use(function(req, res, next) {
  let allowedOrigins = ['http://127.0.0.1:3010', 'http://localhost:8080'];
  let origin = req.headers.origin;
  if(allowedOrigins.indexOf(origin) > -1){
       res.setHeader('Access-Control-Allow-Origin', origin);
  }
  //res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:8020');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', true);
  return next();
});

app.get('/', (req, res) => {
	res.json({api: 'work', status: '1'})
})

app.get('/add/torrent/:magnet', (req, res) => {
	if(req.params.magnet){
		
        let magnetURI = 'magnet:?xt=urn:btih:'+req.params.magnet;
        if(client.get(magnetURI) == null){
            client.add(magnetURI, (torrent) => {
                res.json({status: 'ok'})
                console.log("[STATUS] ok")
            })
        }else{
            res.json({status: 'error', message: 'Cannot add duplicate torrent. Try stream'})
            console.log("[ERROR] Cannot add duplicate torrent. Try stream")	
        }
	}
})

const getLargestFile = function (torrent) {
    const file;
    for(i = 0; i < torrent.files.length; i++) {
        if (!file || file.length < torrent.files[i].length) {
            file = torrent.files[i];
        }
    }
    return file;
}

app.get('/stream/torrent/:magnet', (req, res) => {
	if(req.params.magnet){
		
		let magnetURI = 'magnet:?xt=urn:btih:'+req.params.magnet

		const torrent = client.get(magnetURI)
        const file = getLargestFile(torrent)
        const total = file.length

        if(typeof req.headers.range != 'undefined') {
            const range = req.headers.range;
            const parts = range.replace(/bytes=/, "").split("-");
            const partialstart = parts[0];
            const partialend = parts[1];
            const start = parseInt(partialstart, 10);
            const end = partialend ? parseInt(partialend, 10) : total - 1;
            const chunksize = (end - start) + 1;
        } else {
            const start = 0; var end = total;
			const chunksize = (end - start) + 1;
        }

        const stream = file.createReadStream({start: start, end: end})
        res.writeHead(206, { 
			'Content-Range': 'bytes ' + start + '-' + end + '/' + total, 
			'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 
			'Content-Type': 'video/mp4' 
		})
        stream.pipe(res)

	}
})

app.get('/status/torrent/:magnet', (req, res) =>{
    if(req.params.magnet){
        let magnetURI = 'magnet:?xt=urn:btih:'+req.params.magnet;
        client.get(magnetURI);
        console.log(client.torrents)
        res.json({
            downloadSpeed: client.downloadSpeed,
            uploadSpeed: client.uploadSpeed,
            totalDownloaded: client.downloaded,
            totalProgress: client.progress,
            torrentPeers: client.numPeers,
            torrentPath: client.path,
            timeRemaining: client.timeRemaining,
        });
    }
});

app.get('/remove/torrent/:magnet', (req, res) => {
	client.remove(req.params.magnet, function callback (err) {
		res.json({status: 'ok'})
	})
})

app.listen(3010);