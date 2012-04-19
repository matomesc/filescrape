var fs = require('fs'),
    http = require('http'),
    url = require('url'),
    path = require('path'),
    exec = require('child_process').exec

var request = require('request'),
    cheerio = require('cheerio')

var full = /^http/

function match(body, expr, root) {
  var result = []
  $ = cheerio.load(body)
  return $('a').toArray()
    .map(function (el) { return $(el).attr('href') })
    .filter(function (href) {
      return expr.test(href)
    })
    .map(function (href) {
      var isRelative = !full.test(href)
      return isRelative ? url.resolve(root, href) : href
    })
}

if (require.main == module) {
  var root = url.parse(process.argv[2]),
      expr = new RegExp(process.argv[3]),
      dest = process.argv[4],
      matches = [],
      start = Date.now(),
      agent = new http.Agent({ maxSockets: 25 }),
      size = 0

  exec('mkdir -p ' + dest, function () {
    request({ url: root }, function (err, res, body) {
      matches = match(body, expr, root)
      matches.forEach(function (file) {
        var name = file.substring(file.lastIndexOf('/') + 1),
            write = fs.createWriteStream(path.resolve(dest, name))
        write.on('close', function () {
          size += this.bytesWritten
        })
        request({ url: file, pool: agent }).pipe(write)
      })
    })
  })

  process.on('exit', function () {
    console.log('done: %s files (%s MB, %ss)',
      matches.length,
      size / (1000000),
      (Date.now() - start) / 1000)
  })
}