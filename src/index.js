'use strict'

var sysPath = require('path');
var fs = require('fs-mode');
var each = require('async-each');
var glob = require('glob');
var chalk = require('chalk');

function defaultSettings(extName) {
  if (extName === 'jade') {
    return {
      regexp: /^\s*(?:include|extends)\s+(.+)/
    };
  }

  if (extName === 'styl') {
    return {
      regexp: /^\s*(?:@import|@require)\s*['"]?([^'"]+)['"]?/,
      exclusion: 'nib',
      moduleDep: true,
      globDeps: true
    };
  }

  if (extName === 'less') {
    return {
      regexp: /^\s*@import\s*(?:\([\w, ]+\)\s*)?(?:(?:url\()?['"]?([^'")]+)['"]?)/
    };
  }

  if (extName === 'scss' || extName === 'sass') {
    return {
      regexp: /^\s*@import\s*['"]?([^'"]+)['"]?/,
      prefix: '_',
      exclusion: /^compass/,
      extensionsList: ['scss', 'sass'],
      multipass: [
        /@import[^;]+;/g,
        /\s*['"][^'"]+['"]\s*,?/g,
        /(?:['"])([^'"]+)/
      ]
    };
  }

  if (extName === 'css') {
    return { regexp: /^\s*@import\s*(?:url\()?['"]([^'"]+)['"]/ };
  }

  return {};
}

function printDepsList(path, depsList) {
  var formatted = depsList.map(function (p) {
    return '    |--' + sysPath.relative('.', p);
  }).join('\n');

  console.log(chalk.green.bold('DEP') + ' ' + sysPath.relative('.', path));
  console.log(formatted || '    |  NO-DEP');
}

function progenyConstructor(mode, settings) {
  settings = settings || {};
  var rootPath = settings.rootPath;
  var altPaths = settings.altPaths;
  var extension = settings.extension;
  var regexp = settings.regexp;
  var prefix = settings.prefix;
  var exclusion = settings.exclusion;
  var extensionsList = settings.extensionsList;
  var multipass = settings.multipass;
  var potentialDeps = settings.potentialDeps;
  var moduleDep = settings.moduleDep;
  var globDeps = settings.globDeps;
  var reverseArgs = settings.reverseArgs;
  var debug = settings.debug;

  function parseDeps(path, source, depsList, callback) {
    var parent;
    if (path) {
      parent = sysPath.dirname(path);
    }

    var mdeps = [];
    if (multipass) {
      mdeps = multipass.slice(0, -1)
        .reduce(function (vals, regex) {
          return vals.map(function (val) {
						if (!val) {
							return [];
						}

            return val.match(regex);
          }).reduce(function (flat, val) {
            return flat.concat(val);
          }, []);
        }, [source])
        .map(function (val) {
          return val.match(multipass[multipass.length - 1])[1];
        });
    }

    var paths = source.toString()
      .split('\n')
      .map(function (line) {
        return line.match(regexp)
      })
      .filter(function (match) {
        return match && match.length > 0;
      })
      .map(function (match) {
        return match[1];
      })
      .concat(mdeps)
      .filter(function (path) {
        if (!Array.isArray(exclusion)) {
          exclusion = [exclusion];
        }

        if (path) {
          return !exclusion.some(function (ex) {
            if (ex instanceof RegExp) {
              return ex.test(path);
            }

            if (typeof ex === 'string') {
              return ex === path;
            }

            return false;
          });
        }

        return false;
      })
      .map(function (path) {
        var allowExtendedImports = globDeps && glob.hasMagic(path) || moduleDep;
        if (!allowExtendedImports && extension &&
          sysPath.extname(path) === '') {
          return path + '.' + extension;
        }
        return path;
      });

    var dirs = [];
    if (parent) {
      dirs.push(parent);
    }

    if (rootPath && rootPath !== parent) {
      dirs.push(rootPath);
    }

    if (Array.isArray(altPaths)) {
      dirs.push.apply(dirs, altPaths);
    }

    var deps = [];
    dirs.forEach(function (dir) {
      paths.forEach(function (path) {
        if (moduleDep && extension && sysPath.extname(path) === '') {
          deps.push(sysPath.join(dir, path + '.' + extension));
          deps.push(sysPath.join(dir, path, 'index.' + extension));
        } else {
          deps.push(sysPath.join(dir, path));
        }
      });
    });

    if (extension) {
      deps.forEach(function (path) {
        var isGlob = globDeps && glob.hasMagic(path);
        if (!isGlob && sysPath.extname(path) !== '.' + extension) {
          deps.push(path + '.' + extension);
        }
      });
    }

    if (prefix) {
      var prefixed = [];
      deps.forEach(function (path) {
        var dir = sysPath.dirname(path);
        var file = sysPath.basename(path);
        if (file.indexOf(prefix) !== 0) {
          prefixed.push(sysPath.join(dir, prefix + file));
        }
      });
      deps = deps.concat(prefixed);
    }

    if (extensionsList.length) {
      var altExts = [];
      deps.forEach(function (path) {
        var dir = sysPath.dirname(path);
        extensionsList.forEach(function (ext) {
          if (sysPath.extname(path) !== '.' + ext) {
            var base = sysPath.basename(path, '.' + extension);
            altExts.push(sysPath.join(dir, base + '.' + ext));
          }
        });
      });

      deps = deps.concat(altExts);
    }

    if (deps.length) {
      each(deps, function (path, callback) {
        if (depsList.indexOf(path) >= 0) {
          callback();
        } else {
          if (globDeps && glob.hasMagic(path)) {
            var addDeps = function (files) {
              each(files, function (path, callback) {
                addDep(path, depsList, callback);
              }, callback);
            };

            if (mode === 'Async') {
              glob(path, function (err, files) {
                if (err) {
                  return callback();
                }

                addDeps(files);
              });
            } else {
              var files = glob.sync(path);
              addDeps(files);
            }
          } else {
            addDep(path, depsList, callback);
          }
        }
      }, callback);
    } else {
      callback();
    }
  }

  function addDep(path, depsList, callback) {
    if (potentialDeps) {
      depsList.push(path);
    }

    fs[mode].readFile(path, { encoding: 'utf8' }, function (err, source) {
      if (err) {
        return callback();
      }

      if (!(depsList.indexOf(path) >= 0 || potentialDeps)) {
        depsList.push(path);
      }

      parseDeps(path, source, depsList, callback);
    });
  }

  var progeny = function (path, source, callback) {
    if (typeof source === 'function') {
      callback = source;
      source = undefined;
    }

    if (reverseArgs) {
      var temp = source;
      source = path;
      path = temp;
    }

    var depsList = [];

    extension = extension || sysPath.extname(path).slice(1);
    var def = defaultSettings(extension);
    regexp = regexp || def.regexp;
    prefix = prefix || def.prefix;
    exclusion = exclusion || def.exclusion;
    extensionsList = extensionsList || def.extensionsList || [];
    multipass = multipass || def.multipass;
    moduleDep = moduleDep || def.moduleDep;
    globDeps = globDeps || def.globDeps;
    debug = debug || def.debug || false;

    function run() {
      parseDeps(path, source, depsList, function () {
        if (debug) {
          printDepsList(path, depsList);
        }
        callback(null, depsList);
      });
    }

    if (source) {
      run();
    } else {
      fs[mode].readFile(path, { encoding: 'utf8' },
        function (err, fileContents) {
          if (err) {
            return callback(err);
          }

          source = fileContents;
          run();
        }
      );
    }
  };

  var progenySync = function (path, source) {
    var result = [];
    progeny(path, source, function (err, depsList) {
      if (err) {
        throw err;
      }

      result = depsList;
    });

    return result;
  };

  if (mode === 'Sync') {
    return progenySync;
  }

  return progeny;
}


module.exports = progenyConstructor.bind(null, 'Async');
module.exports.Sync = progenyConstructor.bind(null, 'Sync');
