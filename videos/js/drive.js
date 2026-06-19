function parseId(input) {
  var m = input.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = input.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = input.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  return input;
}

function embedUrl(id) {
  return 'https://drive.google.com/file/d/' + id + '/preview';
}

function mediaUrl(id) {
  return 'https://www.googleapis.com/drive/v3/files/' + id + '?alt=media&key=' + DRIVE_API_KEY;
}

function listFolder(folderId, callback) {
  function attempt(retriesLeft, delay) {
    var url = 'https://www.googleapis.com/drive/v3/files'
      + '?q=' + encodeURIComponent("'" + folderId + "' in parents and trashed=false")
      + '&fields=files(id,name,mimeType,thumbnailLink)'
      + '&orderBy=name'
      + '&pageSize=200'
      + '&key=' + DRIVE_API_KEY;
    fetch(url)
      .then(function(r) {
        if (r.status === 429) {
          if (retriesLeft > 0) {
            setTimeout(function() { attempt(retriesLeft - 1, delay * 2); }, delay);
          } else {
            callback([]);
          }
          return null;
        }
        return r.json();
      })
      .then(function(data) {
        if (data === null) return;
        callback(data.files || []);
      })
      .catch(function() { callback([]); });
  }
  attempt(6, 500);
}
