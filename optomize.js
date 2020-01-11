const fs = require('fs');
const prettyBytes = require('pretty-bytes');

const optomize = require(__dirname + '/helpers/imageOptimizer.js')

//2560 x 1440 26"
//3840 x 2160 34"

let total_size = {
  'start': 0,
  'to': 0,
};

function isImage(f) {
  f = f.toLowerCase();
  if (f.indexOf('.jpg') > 0) return true;
  if (f.indexOf('.jpeg') > 0) return true;
  if (f.indexOf('.png') > 0) return true;
  if (f.indexOf('.gif') > 0) return true;
  if (f.indexOf('.svg') > 0) return true;

  return false;
}

let cnt = 0;

scanDir('in/', 'out/');

function scanDir(baseDir, outDir) {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, {recursive: true})
  }

  fs.readdir(baseDir, function (err, items) {
    let index = 0;
    if(err) {
      console.log(err);
      return;
    }
    function next() {
      for (; ; index++) {
        if (index >= items.length) {
          console.log('Total image', cnt);
          return;
        }
        if (fs.lstatSync(baseDir + items[index]).isDirectory()) {
          scanDir(baseDir + items[index] + '/', outDir + items[index] + '/');
          continue;
        }
        if (!(index < items.length && !isImage(baseDir + items[index]))) break;
      }

      optomize.one(baseDir + items[index++], outDir, 1600)
        .then(() => {
          let item = items[index];
          setTimeout(function (item) {
            console.log(item, getFilesize(baseDir + item, 'start'), getFilesize(outDir + item, 'to'));
          }, 1000, item)
          //index++;
          next()
        })
        .catch(() => {
          //index++;
          next()
        });
      cnt++;
    }

    next()
  });
}

function getFilesize(filename, type) {
  try {
    const stats = fs.statSync(filename)
    const fileSizeInBytes = stats.size

    total_size[type] += fileSizeInBytes
    return prettyBytes(fileSizeInBytes)
  } catch (err) {
    return '-'
  }
}
