'use strict';
var fs = require('fs');
var path = require('path');
var js = require('default-require-extensions/js');
var findCacheDir = require('find-cache-dir');
var md5hex = require('md5-hex');

function runTest(opts) {
	var testPath = opts.testPath;
	var code = fs.readFileSync(testPath);
	var hash = md5hex(code);

	var cacheDir = findCacheDir({name: 'ava', create: true});
	var cachedFile = path.join(cacheDir, hash + '.js');
	if (!fs.existsSync(cachedFile)) {
		return opts.loadWorker().runTest(testPath, opts.babelConfig);
	}

	// Guard against babel-core/register overriding the default extension.
	var oldExtension = require.extensions['.js'];
	require.extensions['.js'] = function (module, filename) {
		if (filename !== opts.testPath) {
			return oldExtension(module, filename);
		}

		require.extensions['.js'] = oldExtension;
		var oldCompile = module._compile;
		module._compile = function () {
			module._compile = oldCompile;
			module._compile(fs.readFileSync(cachedFile, 'utf8'), testPath);
		};

		js(module, testPath);
	};
	require(testPath); // eslint-disable-line import/no-dynamic-require
}
exports.runTest = runTest;