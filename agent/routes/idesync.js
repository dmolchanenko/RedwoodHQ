var chokidar = require('chokidar');

var watcher = chokidar.watch('C:/Users/Dmitri/OneDrive/workspace/redwood/agent', {interval:5000,usePolling:true,ignoreInitial:true,ignored: /[\/\\]\./, persistent: true});

watcher
    .on('add', function(path) {console.log('File', path, 'has been added');})
    .on('addDir', function(path) {console.log('Directory', path, 'has been added');})
    .on('change', function(path) {console.log('File', path, 'has been changed');})
    .on('unlink', function(path) {console.log('File', path, 'has been removed');})
    .on('unlinkDir', function(path) {console.log('Directory', path, 'has been removed');})
    .on('error', function(error) {console.error('Error happened', error);});
