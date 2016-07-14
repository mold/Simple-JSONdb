const fs = require("fs");

/**
 * Default configuration values.
 * @type {{asyncWrite: boolean, syncOnWrite: boolean}}
 */
const defaultOptions = {
  asyncWrite: false,
  syncOnWrite: true
};

/**
 * Validates the contents of a JSON file.
 * @param {string} fileContent
 * @returns {boolean} `true` if content is ok, throws error if not.
 */
let validateJSON = function(fileContent) {
  try {
    JSON.parse(fileContent);
  } catch (e) {
    throw new Error('Given filePath is not empty and its content is not valid JSON.');
  }
  return true;
};

/**
 * Main constructor, manages exhisting storage file and parses options against default ones.
 * @param {string} filePath The path of the file to use as storage.
 * @param {object} [options] Configuration options.
 * @param {boolean} [options.asyncWrite] Enables the storage to be asynchronously written to disk. Disabled by default (synchronous behaviour).
 * @param {boolean} [options.syncOnWrite] Makes the storage be written to disk after every modification. Enabled by default.
 * @constructor
 */
function JSONdb(filePath, options) {
  // Mandatory arguments check
  if ( !filePath || !filePath.length) {
    throw new Error('Missing filePath argument.');
  } else {
    this.filePath = filePath;
  }

  // Options parsing
  if (options) {
    for (let key in defaultOptions) {
      if (!options.hasOwnProperty(key)) options[key] = defaultOptions[key];
    }
    this.options = options;
  } else {
    this.options = defaultOptions;
  }


  // Storage initialization
  this.storage = {};

  // File exhistence check
  let stats;
  try {
    stats = fs.statSync(filePath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      /* File doesn't exhist */
      return;
    } else {
      // Other error
      throw err;  // TODO: Check perm
    }
  }
  /* File exhists */
  try {
    fs.accessSync(filePath, fs.constants.R_OK | fs.constants.W_OK);
  } catch (err) {
    throw new Error(`Cannot read & write on path "${filePath}"`);
  }
  if (stats.size > 0) {
    let data;
    try {
      data = fs.readFileSync(filePath);
    } catch (err) {
      throw err;  // TODO: Do something meaningful
    }
    if (validateJSON(data)) this.storage = JSON.parse(data);
  }
}

/**
 * Creates or modifies a key in the database.
 * @param {string} key The key to create or alter.
 * @param {object} value Whatever to store in the key. You name it, just keep it JSON-friendly.
 */
JSONdb.prototype.set = function(key, value) {
  this.storage[key] = value;
  if (this.options && this.options.syncOnWrite) this.sync();
};

/**
 * Extracts the value of a key from the database.
 * @param {string} key The key to search for.
 * @returns {object|undefined} The value of the key or `undefined` if it doesn't exhist.
 */
JSONdb.prototype.get = function(key) {
  return this.storage.hasOwnProperty(key) ? this.storage[key] : undefined;
};

/**
 * Deletes a key from the database.
 * @param {string} key The key to delete.
 * @returns {boolean|undefined} `true` if the deletion succeeded, `false` if there was an error, or `undefined` if the key wasn't found.
 */
JSONdb.prototype.delete = function(key) {
  let retVal = this.storage.hasOwnProperty(key) ? delete this.storage[key] : undefined;
  if (this.options && this.options.syncOnWrite) this.sync();
  return retVal;
};

/**
 * Writes the local storage object to disk.
 */
JSONdb.prototype.sync = function() {
  if (this.options && this.options.asyncWrite) {
    fs.writeFile(this.filePath, JSON.stringify(this.storage, null, 4), (err) => {
      if (err) throw err;
    });
  } else {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.storage, null, 4));
    } catch (err) {
      throw err;  // TODO: Do something meaningful
    }
  }
};

/**
 * If no parameter is given, returns **a copy** of the local storage. If an object is given, it is used to replace the local storage.
 * @param {object} storage A JSON object to overwrite the local storage with.
 * @returns {object} Clone of the internal JSON storage. `Error` if a parameter was given and it was not a valid JSON object.
 */
JSONdb.prototype.JSON = function(storage) {
  if (storage) {
    try {
      JSON.parse(JSON.stringify(storage));
      this.storage = storage;
    } catch (err) {
      throw new Error('Given parameter is not a valid JSON object.');
    }
  }
  return JSON.parse(JSON.stringify(this.storage));
};

module.exports = JSONdb;
