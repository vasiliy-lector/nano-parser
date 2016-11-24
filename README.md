# nano-parser
Tool for parsing ecmascript tagged template strings. [Read in russian](./README_RU.md)

## Installing
```bash
npm install --save 'nano-parser';
```

## Usage
```javascript
    const {
        any,
        deffered,
        end,
        find,
        next,
        optional,
        repeat,
        required,
        sequence
    } = require('nano-parser');

    const parser = find(/[a-z]+/);
    parser.parse('abcd'); // abcd
    parser.parse('ab1cd'); // ab
    parser.parse('1abcd'); // undefined
```

## Introduction
With the help of nano-parser, you can create sophisticated parsers, combining simple. It is possible to transform the results using the method **then**, as well as to use the cache to improve performance.

### Elementary parsers
**find**, **next** and **end** are most simple parsers. **find** parser designed to search for  strings or regular expressions. **next** and **end** used when parsing an array of strings (useful for es6 template strings).

### Combinators
**any**, **sequence** and **repeat** designed to combine other parsers with each other.

### Subsidiary parsers
**optional**, **required** and **deffered** are subsidiary. **optional** makes parser optional, **required** makes parser strictly necessary and **deferred** provides the possibility to call the parser from itself.

### Class Parser
All parsers return a instance of class **Parser**. Therefore, they have the same interface. The **exec** method is internal and is used to call from other parsers. Instead, use the **parse** method. The **parse** method takes the first argument string or array of strings that need to parse, optional second parameter values are values that will be available as the second parameter of the method **then**. To cache the results use **useCache** method.

