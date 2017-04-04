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

const host = 'http://localhost:' + config.net.port;
const cookie_o2r = 's:C0LIrsxGtHOGHld8Nv2jedjL4evGgEHo.GMsWD5Vveq0vBt7/4rGeoH5Xx7Dd2pgZR9DvhKCyDTY';
const requestLoadingTimeout = 10000;
const createCompendiumPostRequest = require('./util').createCompendiumPostRequest;


describe('Direct upload of ERC', function () {
    describe('POST /api/v1/compendium response with executable ERC', () => {
        before((done) => {
            let req = createCompendiumPostRequest(host, './test/erc/executable', cookie_o2r);

            request(req, (err, res, body) => {
                assert.ifError(err);
                done();
            });
        });

        it('should respond with HTTP 200 OK', (done) => {
            request(host + '/api/v1/compendium', (err, res, body) => {
                let req = createCompendiumPostRequest(host, './test/erc/executable', cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 200);
                    done();
                });
            });
        });

        it('should respond with valid JSON', (done) => {
            request(host + '/api/v1/compendium', (err, res, body) => {
                let req = createCompendiumPostRequest(host, './test/erc/executable', cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.isObject(JSON.parse(body), 'returned JSON');
                    done();
                });
            });
        });

        it('should give a response including the id field', (done) => {
            request(host + '/api/v1/compendium', (err, res, body) => {
                let req = createCompendiumPostRequest(host, './test/erc/executable', cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.isDefined(JSON.parse(body).id, 'returned id');
                    assert.property(JSON.parse(body), 'id');
                    done();
                });
            });
        });
    });


    describe('POST /api/v1/compendium with invalid bag', () => {
        it('should fail the upload because bag is invalid', (done) => {
            let req = createCompendiumPostRequest(host, './test/erc/invalid_bag', cookie_o2r);

            request(req, (err, res, body) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 400);
                assert.include(body, 'bag ist invalid');
                done();
            });
        }).timeout(requestLoadingTimeout);

        it('should not tell about internal server configuration in the error message', (done) => {
            let req = createCompendiumPostRequest(host, './test/erc/invalid_bag', cookie_o2r);

            request(req, (err, res, body) => {
                assert.ifError(err);
                assert.notInclude(body, config.fs.base);
                done();
            });
        }).timeout(requestLoadingTimeout);
    });

    describe.skip('POST /api/v1/compendium with virus', () => {
        it('upload compendium should fail and return an error message about infected files', (done) => {
            let req = createCompendiumPostRequest('./test/bagtainers/virustainer', cookie);
            request(req, (err, res, body) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 422);
                assert.include(body, 'infected file(s)');
                done();
            });
        });
    });

});