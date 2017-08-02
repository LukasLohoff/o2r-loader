/*
 * (C) Copyright 2016 o2r project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

/* eslint-env mocha */
const assert = require('chai').assert;
const request = require('request');
const fs = require('fs');
const config = require('../config/config');

require("./setup")
const cookie = 's:C0LIrsxGtHOGHld8Nv2jedjL4evGgEHo.GMsWD5Vveq0vBt7/4rGeoH5Xx7Dd2pgZR9DvhKCyDTY';
const requestLoadingTimeout = 2000;


describe('Direct upload of invalid files', function () {

    describe('POST /api/v1/compendium invalid.zip (not a zip file)', () => {
        it('should respond with HTTP 500 error', (done) => {
            let formData = {
                'content_type': 'compendium_v1',
                'compendium': {
                    value: fs.createReadStream('./test/erc/invalid.zip'),
                    options: {
                        contentType: 'application/zip'
                    }
                }
            };
            let j = request.jar();
            let ck = request.cookie('connect.sid=' + cookie);
            j.setCookie(ck, global.test_host);

            request({
                uri: global.test_host + '/api/v1/compendium',
                method: 'POST',
                jar: j,
                formData: formData,
                timeout: requestLoadingTimeout
            }, (err, res, body) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 500);
                assert.isObject(JSON.parse(body), 'returned JSON');
                assert.isDefined(JSON.parse(body).error, 'returned error');
                assert.include(JSON.parse(body).error, 'extraction failed: ');
                done();
            });
        });

        it('should provide a useful error message', (done) => {
            let formData = {
                'content_type': 'compendium_v1',
                'compendium': {
                    value: fs.createReadStream('./test/erc/invalid.zip'),
                    options: {
                        contentType: 'application/zip'
                    }
                }
            };
            let j = request.jar();
            let ck = request.cookie('connect.sid=' + cookie);
            j.setCookie(ck, global.test_host);

            request({
                uri: global.test_host + '/api/v1/compendium',
                method: 'POST',
                jar: j,
                formData: formData,
                timeout: requestLoadingTimeout
            }, (err, res, body) => {
                assert.ifError(err);
                assert.isObject(JSON.parse(body), 'returned JSON');
                assert.isDefined(JSON.parse(body).error, 'returned error');
                assert.include(JSON.parse(body).error, 'extraction failed: ');
                done();
            });
        });

        it('should NOT respond with internal configuration of the server', (done) => {
            let formData = {
                'content_type': 'compendium_v1',
                'compendium': {
                    value: fs.createReadStream('./test/erc/invalid.zip'),
                    options: {
                        contentType: 'application/zip'
                    }
                }
            };
            let j = request.jar();
            let ck = request.cookie('connect.sid=' + cookie);
            j.setCookie(ck, global.test_host);

            request({
                uri: global.test_host + '/api/v1/compendium',
                method: 'POST',
                jar: j,
                formData: formData,
                timeout: requestLoadingTimeout
            }, (err, res, body) => {
                assert.ifError(err);
                assert.notInclude(JSON.parse(body).error, config.fs.base);
                done();
            });
        });
    });

    describe('POST /api/v1/compendium empty.zip (empty zip file)', () => {
        it('should respond with ERROR 500 and valid JSON document', (done) => {
            let formData = {
                'content_type': 'compendium_v1',
                'compendium': {
                    value: fs.createReadStream('./test/erc/empty.zip'),
                    options: {
                        contentType: 'application/zip'
                    }
                }
            };
            let j = request.jar();
            let ck = request.cookie('connect.sid=' + cookie);
            j.setCookie(ck, global.test_host);

            request({
                uri: global.test_host + '/api/v1/compendium',
                method: 'POST',
                jar: j,
                formData: formData,
                timeout: requestLoadingTimeout
            }, (err, res, body) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 500);
                assert.isObject(JSON.parse(body), 'returned JSON');
                done();
            });
        }).timeout(1000 * 60);

        it('should respond provide a helpful error message', (done) => {
            let formData = {
                'content_type': 'compendium_v1',
                'compendium': {
                    value: fs.createReadStream('./test/erc/empty.zip'),
                    options: {
                        contentType: 'application/zip'
                    }
                }
            };
            let j = request.jar();
            let ck = request.cookie('connect.sid=' + cookie);
            j.setCookie(ck, global.test_host);

            request({
                uri: global.test_host + '/api/v1/compendium',
                method: 'POST',
                jar: j,
                formData: formData,
                timeout: requestLoadingTimeout
            }, (err, res, body) => {
                assert.ifError(err);
                assert.include(JSON.parse(body).error, 'zipfile is empty');
                done();
            });
        });

        it('should NOT respond with internal configuration of the server', (done) => {
            let formData = {
                'content_type': 'compendium_v1',
                'compendium': {
                    value: fs.createReadStream('./test/erc/empty.zip'),
                    options: {
                        contentType: 'application/zip'
                    }
                }
            };
            let j = request.jar();
            let ck = request.cookie('connect.sid=' + cookie);
            j.setCookie(ck, global.test_host);

            request({
                uri: global.test_host + '/api/v1/compendium',
                method: 'POST',
                jar: j,
                formData: formData,
                timeout: requestLoadingTimeout
            }, (err, res, body) => {
                assert.ifError(err);
                assert.notInclude(JSON.parse(body).error, config.fs.base);
                done();
            });
        });
    });

    describe('POST /api/v1/compendium unsupported_encoding.zip (encoding: SHIFT_JIS)', () => {
        it('should respond with HTTP 422 error', (done) => {
            let formData = {
                'content_type': 'compendium_v1',
                'compendium': {
                    value: fs.createReadStream('./test/erc/unsupported_encoding.zip'),
                    options: {
                        contentType: 'application/zip'
                    }
                }
            };
            let j = request.jar();
            let ck = request.cookie('connect.sid=' + cookie);
            j.setCookie(ck, global.test_host);

            request({
                uri: global.test_host + '/api/v1/compendium',
                method: 'POST',
                jar: j,
                formData: formData,
                timeout: requestLoadingTimeout
            }, (err, res, body) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 422);
                assert.isObject(JSON.parse(body), 'returned JSON');
                assert.isDefined(JSON.parse(body).error, 'returned error');
                assert.include(JSON.parse(body).error, 'files with unsupported encoding detected: ');
                assert.include(JSON.parse(body).error, '"encoding":"Shift_JIS"');
                assert.include(JSON.parse(body).error, '/data/test.txt');
                done();
            });
        });
    });
});
