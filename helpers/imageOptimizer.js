const fs = require('fs');
const path = require('path');
//const Jimp = require('jimp');
const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');
const imageminGifsicle = require('imagemin-gifsicle');
const imageminSvgo = require('imagemin-svgo');

//const prettyBytes = require('pretty-bytes');
const sharp = require('sharp');
const sizeOf = require('image-size');
const probe = require('probe-image-size');

var thumbsList = [
  '450',
  '600',
  '900',
];

function makeOne(from, outDir, maxW, fileNameTo, compress) {

  let fileName = path.basename(from)
  if (!fileNameTo) fileNameTo = fileName;

  let to = outDir + fileNameTo;
  from = from.replace(fileName, '')

  //console.log(to,from)
  if (!maxW) {
    maxW = 2560;
  }
  //console.log(from, outDir, maxW,from,fileName); return;

  return new Promise(function (resolve, reject) {
    maxW = parseInt(maxW)
    let sImg = from + fileName

    if (fs.existsSync(to)) {
      resolve(fileName);
      console.log('file уже создан');
      return
    }

    let imgInfo
    try {
      imgInfo = sizeOf(sImg)
    } catch (e) {
      let data = fs.readFileSync(sImg);
      try {
        imgInfo = probe.sync(data);
      } catch (e) {
        console.log('file info error', sImg, e.message)
        resolve(false);
        return;
      }
    }
    if (!imgInfo) {
      console.log('file info error', sImg, e.message)
      resolve(false);
      return;
    }

    let quality = 75;
    if (compress == -1 && (!maxW || imgInfo.width < maxW)) {
      sharp(sImg)
        .toFile(to, (err, info) => {
          if (err) {
            reject(fileName);
            return
          }
          resolve(fileName)
        });
      return;
    } else if (!compress || compress == -1) {
      if (imgInfo.width < 800) quality = 80;
      if (imgInfo.width < 400) quality = 85;
      if (imgInfo.width < 200) quality = 90;
    } else {
      quality = compress;
    }

    if (imgInfo.width > maxW) {
      let h = Math.floor(imgInfo.height / (imgInfo.width / maxW))
      sharp(sImg)
        .resize(maxW, h)
        .toFile(to, (err, info) => {
          if (err) {
            reject(fileName)
            return
          }
          saveImage(to, outDir, maxW > 1000, quality)
            .then(() => resolve(fileName))
        })
    } else {
      fs.copyFile(sImg, to,() => {
        saveImage(to, outDir, maxW > 1000, quality)
          .then(() => resolve(fileName))
      })
    }
  })
}

function saveImage(sImg, outDir, progressive, quality) {
  if (!quality) quality = 75;
  return new Promise(async (resolve) => {
    await (async () => {
      await imagemin([sImg], outDir, {
        use: [
          imageminMozjpeg({
            quality,
            progressive: !!progressive
          }),
          imageminPngquant(),
          imageminGifsicle({
            interlaced: !!progressive,
            optimizationLevel: 3
          }),
          imageminSvgo({
            plugins: [
              {removeViewBox: false},
              {convertPathData: false},
            ]
          })
        ]
      })
    })()
    resolve();
  })
}

function makeImage(from, toDir, testDir, maxWidth, compress, name) {
  if (typeof (testDir) === 'undefined' || testDir) {
    testDirF(toDir + 'thumbs/');
    for (let j = 0; j < thumbsList.length; j++) {
      testDirF(toDir + 'thumbs/' + thumbsList[j] + '/')
    }
  }

  return makeOne(from, toDir, maxWidth, name, compress)
    .then((item) => {
      let p = []

      for (let j = 0; j < thumbsList.length; j++) {
        p.push(makeOne(from, toDir + 'thumbs/' + thumbsList[j] + '/', thumbsList[j], name));
      }
      return Promise.all(p)
    })
}

function fromBase64(data, name, outDir, maxWidth, withThumbs) {
  let compress = '';
  let rewrite = false;
  if (typeof data == 'object') {
    outDir = data.outDir;
    if (data.name) name = data.name;
    if (data.maxWidth) maxWidth = data.maxWidth;
    if (data.withThumbs) withThumbs = !!parseInt(data.withThumbs);
    if (data.compress) compress = data.compress;
    if (data.rewrite) rewrite = !!parseInt(data.rewrite);
    data = data.data;
  }

  compress = isNaN(parseInt(compress)) ? false : parseInt(compress);
  maxWidth = isNaN(parseInt(maxWidth)) ? false : parseInt(maxWidth);

  //console.log({withThumbs, name, maxWidth, rewrite});

  return new Promise((resolve, reject) => {
    data = data.split(';base64,');
    let ex = data[0]
      .toLocaleLowerCase()
      .split('image/')
      .pop()
      .split('+')
      .shift()
      .trim();
    data = data.pop();
    if (!name) {
      name = Math.random(Date.now()).toString().substr(2)
    }

    name = name.toLowerCase();
    name = toName(name)

    testDirF(outDir);

    let index = 0;
    let s = ""

    while (fs.existsSync(__dirname + '/../runtime/' + name + s + '.' + ex)) {
      index++;
      s = '_' + index;
    }
    let runTimeFile = __dirname + '/../runtime/' + name + '.' + ex;

    s = ""
    if (!rewrite) {
      let index = 0;

      while (fs.existsSync(outDir + name + s + '.' + ex)) {
        index++;
        s = '_' + index;
      }
    } else {
      if (fs.existsSync(outDir + name + s + '.' + ex)) {
        fs.unlinkSync(outDir + name + s + '.' + ex)
      }
    }
    name = name + s + '.' + ex;

    fs.writeFile(runTimeFile, data, {encoding: 'base64'}, function (err) {
      (withThumbs ?
          makeImage(runTimeFile, outDir, true, maxWidth, compress, name) :
          makeOne(runTimeFile, outDir, maxWidth, name, compress)
      ).then((d) => {
        //console.log(d)
        setTimeout(function () {
          unlinkFile(runTimeFile)
        }, 5000);
        resolve(name)
      })
    });
  })
}

function testDirF(path) {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, {recursive: true})
  }
}

function unlinkFile(path) {
  if (fs.existsSync(path) && fs.lstatSync(path).isFile()) {
    fs.unlinkSync(path)
  }
}

function toName(text) {
  let p = text.lastIndexOf('.');
  if (p > 0 && (text.length - p) < 5) {
    text = text.substr(0, p)
  }

  return text.replace(/([а-яё])|([\s_-])|([^a-z\d])/gi,
    function (all, ch, space, words, i) {
      if (space || words) {
        return space ? '-' : '';
      }
      var code = ch.charCodeAt(0),
        index = code == 1025 || code == 1105 ? 0 :
          code > 1071 ? code - 1071 : code - 1039,
        t = ['yo', 'a', 'b', 'v', 'g', 'd', 'e', 'zh',
          'z', 'i', 'y', 'k', 'l', 'm', 'n', 'o', 'p',
          'r', 's', 't', 'u', 'f', 'h', 'c', 'ch', 'sh',
          'shch', '', 'y', '', 'e', 'yu', 'ya'
        ];
      return t[index];
    });
}

function removeFile(file, dir, withThumbs) {
  unlinkFile(dir + file);
  if (withThumbs) {
    for (let j = 0; j < thumbsList.length; j++) {
      unlinkFile(dir + 'thumbs/' + thumbsList[j] + '/' + file)
    }
  }
}

module.exports = {
  'fromBase64': fromBase64,
  'one': makeOne,
  'withThumbs': makeImage,
  'removeFile': removeFile,
  'unlinkFile': unlinkFile
}
