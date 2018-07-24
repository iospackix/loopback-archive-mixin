'use strict';

module.exports = (Model, _options) => {
  const deletedAt = _options.deletedAt || 'deletedAt';
  const isDeleted = _options.isDeleted || 'isDeleted';

  Model.defineProperty(deletedAt, {type: Date, required: false, index: true});
  Model.defineProperty(isDeleted, {type: Boolean, required: true, default: false, index: true});

  Model.destroyAll = function softDestroyAll(where, cb) {
//     if (typeof cb !== 'function') {
//       console.log('cb function');
//       console.log(cb);
//       console.log('where filter');
//       console.log(where);
//       console.log('Non-function cb in destroyAll', cb);
//       console.log('Extra Var');
//       console.log(extraVar);
//       cb = err => {
//         if (!err) return;
//         throw err;
//       };
//     }
    /**
     * Context constructed based on loopback-datasource-juggler
     * destroyAll context
     **/
    const context = {
      Model,
      where,
      hookState: {},
      options: {}
    };
    let output;
    return this.notifyObserversOf('before archive', context)
      .then(() => this.updateAll(where, {
        [deletedAt]: (new Date()).toISOString(),
        [isDeleted]: true
      }))
      .then(_output => output = _output)
      .then(() => this.notifyObserversOf('after archive', context))
      .then(result => (typeof cb === 'function') ? cb(null, output) : output)
      .catch(error => (typeof cb === 'function') ? cb(error) : Promise.reject(error));
  };

  Model.remove = Model.destroyAll;
  Model.deleteAll = Model.destroyAll;

  Model.destroyById = function softDestroyById(id, cb) {
   // const callback = (cb === undefined && typeof options === 'function') ? options : cb;
//     console.log('Extra Var #2');
//     console.log(extravar);
    return this.destroyAll({id}, cb);
  };

  Model.removeById = Model.destroyById;
  Model.deleteById = Model.destroyById;

  Model.prototype.destroy = function softDestroy(options, cb) {
    console.log('called proto destroy');
    const callback = (cb === undefined && typeof options === 'function') ? options : cb;
    return Model.destroyById(this.id, callback);
  };

  Model.prototype.remove = Model.prototype.destroy;
  Model.prototype.delete = Model.prototype.destroy;

  const queryNonDeleted = {isDeleted: {neq: true}};

  const _findOrCreate = Model.findOrCreate;
  Model.findOrCreate = function findOrCreateDeleted(_query, ...rest) {
    const query = _query || {};
    if (!query.deleted) {
      query.where = {and: [query.where || {}, queryNonDeleted]};
    }
    return _findOrCreate.call(this, query, ...rest);
  };

  const _find = Model.find;
  Model.find = function findDeleted(_query, ...rest) {
    const query = _query || {};
    if (!query.deleted) {
      query.where = {and: [query.where || {}, queryNonDeleted]};
    }
    return _find.call(this, query, ...rest);
  };

/**
 * If you supply either a deletedAt or an isDeleted property to the where clause
 * in either of these we run the query as normal
 **/
  const _count = Model.count;
  Model.count = function countDeleted(_where, ...rest) {
    const where = _where || {};
    if (typeof where[isDeleted] === 'undefined' &&
        typeof where[deletedAt] === 'undefined') {
      const whereNotDeleted = { and: [ where, queryNonDeleted ] };
      return _count.call(this, whereNotDeleted, ...rest);
    }
    return _count.call(this, where, ...rest);
  };

  const _update = Model.update;
  Model.update = Model.updateAll = function updateDeleted(_where, ...rest) {
    const where = _where || {};
    if (typeof where[isDeleted] === 'undefined' &&
        typeof where[deletedAt] === 'undefined') {
      const whereNotDeleted = { and: [ where, queryNonDeleted ] };
      return _update.call(this, whereNotDeleted, ...rest);
    }
    return _update.call(this, where, ...rest);
  };
};
