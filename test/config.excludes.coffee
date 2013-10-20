progeny = require '..'
path = require 'path'
assert = require 'assert'

getFixturePath = (subPath) ->
  path.join __dirname, 'fixtures', subPath

describe 'progeny configuration', ->
  describe 'excluded file list', ->
    progenyConfig = 
      rootPath: path.join __dirname, 'fixtures'
      exclusion: [
        /excludedDependencyOne/
        /excludedDependencyTwo/
      ]
      extension: 'jade'

    it 'should accept one regex', (done) ->
      progenyConfig.exclusion = /excludedDependencyOne/
      getDependencies = progeny progenyConfig

      getDependencies null, getFixturePath('excludedDependencies.jade'), (err, dependencies) ->
        paths =  (getFixturePath x for x in ['excludedDependencyTwo.jade', 'includedDependencyOne.jade'])
        assert.deepEqual dependencies, paths
        do done

    it 'should accept one string', (done) ->
      progenyConfig.exclusion = 'excludedDependencyOne'
      getDependencies = progeny progenyConfig

      getDependencies null, getFixturePath('excludedDependencies.jade'), (err, dependencies) ->
        paths =  (getFixturePath x for x in ['excludedDependencyTwo.jade', 'includedDependencyOne.jade'])
        assert.deepEqual dependencies, paths
        do done

    it 'should accept a list of regexes', (done) ->
      progenyConfig.exclusion = [
        /excludedDependencyOne/
        /excludedDependencyTwo/
      ]
      getDependencies = progeny progenyConfig

      getDependencies null, getFixturePath('excludedDependencies.jade'), (err, dependencies) ->
        assert.deepEqual dependencies, [getFixturePath 'includedDependencyOne.jade']
        do done

    it 'should accept a list of strings', (done) ->
      progenyConfig.exclusion = [
        'excludedDependencyOne'
        'excludedDependencyTwo'
      ]
      getDependencies = progeny progenyConfig

      getDependencies null, getFixturePath('excludedDependencies.jade'), (err, dependencies) ->
        assert.deepEqual dependencies, [getFixturePath 'includedDependencyOne.jade']
        do done

    it 'should accept a list of both strings and regexps', (done) ->
      progenyConfig.exclusion = [
        'excludedDependencyOne'
        /excludedDependencyTwo/
      ]
      getDependencies = progeny progenyConfig

      getDependencies null, getFixturePath('excludedDependencies.jade'), (err, dependencies) ->
        assert.deepEqual dependencies, [getFixturePath 'includedDependencyOne.jade']
        do done
