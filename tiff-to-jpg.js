const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');
const sharp = require('sharp');

let [fromDir,toDir] = [
  'tiff/',
  'in/'
];

testDirF(toDir);
const options = {
  logLevel: 1
};

fs.readdir(fromDir, function (err, items) {
  items.map(item=>{
    let fileName = item.split('.').slice(0, -1).join('.')+'.jpg';
    item = fromDir+item;
    sharp(item)
      .toFile(toDir+fileName)
    /*Jimp.read(item, (err, img) => {
      if (err) throw err;
      img
        //.resize(256, 256)
        //.greyscale()
        .quality(85)
        .write(toDir+fileName);
    });*/
  });
})

function testDirF(path) {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, {recursive: true})
  }
}
