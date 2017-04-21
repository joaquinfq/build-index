# build-index [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)

Build index of EcmaScript package.
Index file can be used as `entry` key of webpack configuration.

## Features

- You can use your own template using `-t` option.
- It's a class, so you can extend it and overwrite any method.

## Usage

[![npm install build-index](https://nodei.co/npm/build-index.png?compact=true)](https://npmjs.org/package/build-index/)

```bash
node build-index -i /path/to/srcdir
```

Some info can be retrieved from `package.json`:

```bash
node build-index -i /path/to/srcdir -p /path/to/package.json
```

## Example

Directory tree:

```bash
└─┬ base.mjs
  └─┬ type
    └─┬ base.mjs
      ├─┬ collection
      │ ├── base.mjs
      │ └── users.mjs
      └─┬ item
        ├── base.mjs
        └── user.mjs
```

Index generated:

```js
import Base from './base.mjs';
import TypeBase from './type/base.mjs';
import TypeCollectionBase from './type/collection/base.mjs';
import TypeCollectionUsers from './type/collection/users.mjs';
import TypeItemBase from './type/item/base.mjs';
import TypeItemUser from './type/item/user.mjs';
/**
 * Archivo índice creado con `build-index`.
 *
 * @author  Joaquín Fernández
 * @created Fri Apr 21 2017 00:25:03 GMT+0200 (CEST)
 * @version 0.1
 */
export default {
    'Base' : Base,
    'type' : {
        'Base' : TypeBase,
        'collection' : {
            'Base' : TypeCollectionBase,
            'Users' : TypeCollectionUsers
        },
        'item' : {
            'Base' : TypeItemBase,
            'User' : TypeItemUser
        }
    }
};
```
