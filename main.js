var express = require('express');
var app = express();
var WebTorrent = require('webtorrent')
var client = new WebTorrent()
var path = require('path');

app.use(function(req, res, next) {
  var allowedOrigins = ['http://127.0.0.1:3010', 'http://localhost:8080'];
  var origin = req.headers.origin;
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

var getLargestFile = function (torrent) {
    var file;
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

		var torrent = client.get(magnetURI)
        var file = getLargestFile(torrent)
        var total = file.length

        if(typeof req.headers.range != 'undefined') {
            var range = req.headers.range;
            var parts = range.replace(/bytes=/, "").split("-");
            var partialstart = parts[0];
            var partialend = parts[1];
            var start = parseInt(partialstart, 10);
            var end = partialend ? parseInt(partialend, 10) : total - 1;
            var chunksize = (end - start) + 1;
        } else {
            var start = 0; var end = total;
			var chunksize = (end - start) + 1;
        }

        var stream = file.createReadStream({start: start, end: end})
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