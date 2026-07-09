const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg.main = "electron/main.cjs";
pkg.build = pkg.build || {};
pkg.build.appId = "com.stratify.app";
pkg.build.productName = "STRATIFY";
pkg.build.directories = {
  output: "release"
};
pkg.build.files = [
  "dist/**/*",
  "electron/**/*"
];
pkg.build.win = {
  target: "nsis"
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('patched package.json for electron');
