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

// General modules
var c = require('../config/config');
var debug = require('debug')('compendium');
var fs = require('fs');

var dirTree = require('directory-tree');
var rewriteTree = require('../lib/rewrite-tree');

var Compendium = require('../lib/model/compendium');
var Job = require('../lib/model/job');
var Loader = require('../lib/loader').Loader;

var url = require('url');


exports.create = (req, res) => {
  // check user level
  if (!req.isAuthenticated()) {
    res.status(401).send('{"error":"user is not authenticated"}');
    return;
  }
  if (req.user.level < c.user.level.create_compendium) {
    res.status(401).send('{"error":"user level does not allow compendium creation"}');
    return;
  }

  // validate share_url
  var hostname = url.parse(req.body.share_url).hostname.split(".");
  hostname = hostname[hostname.length - 2];

  if (hostname !== 'sciebo') {
    res.status(403).send('Public share host is not allowed, only "sciebo" is supported.');
    debug('Public share host "%s" is not allowed.', hostname);
    return;
  }

  // validate path

  // validate content_type
  if (req.body.content_type === 'compendium_v1') {
    debug('Creating new %s for user %s)',
      req.body.content_type, req.user.id);

    var loader = new Loader(req, res);
    loader.load((id) => {
      debug('New compendium %s successfully loaded', id);
    });
  } else {
    res.status(500).send('Provided content_type not yet implemented, only "compendium_v1" is supported.');
    debug('Provided content_type "%s" not implemented', req.body.content_type);
  } 
};

