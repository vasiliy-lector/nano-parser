# nano-parser
Пакет, предназначенный для упрощения парсинга тегированных шаблонных строк.

## Установка
```bash
npm install --save 'nano-parser';
```

## Использование
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

## Примеры использования:
* [es6x - реализация возможностей jsx на чистом javascript](https://github.com/vasiliy-lector/es6x)

## Введение
С помощью nano-parser Вы можете создавать сложные парсеры, комбинируя простые. Есть возможность трансформировать результаты с помощью метода **then**, а так же кешировать результаты для ускорения повторной обработки.

### Элементарные парсеры
**find**, **next** и **end** наиболее простые парсеры. **find** предназначен для поиска строк или регулярных выражений. **next** и **end** используются при парсинге массива строк (актуально для разбора шаблонных строк)

### Комбинаторы
**any**, **sequence** и **repeat** предназначены для комбинирования других парсеров друг с другом

### Вспомогательные парсеры
**optional**, **required** и **deffered** являются вспомогательными. Они, соответственно, делают необязательным наличие парсера, строго обязательным, а **deferred** служит для возможности обращения к парсеру из самого себя.

### Класс Parser
Все парсеры при создании возвращают instance класса **Parser**. Поэтому имеют один и тот же интерфейс. Метод **exec** - является внутренним - для вызова из других парсеров. Пользователю доступен метод **parse**. Метод **parse** принимает первым параметром строку или массив строк, которые необходимо распарсить, вторым параметром опционально значения values, которые будут доступны вторым же параметром из метода **then**. Для кеширования результатов предназначен метод **useCache**.

## Документация

### find
**find** используется для поиска по регулярному выражению или прямому совпадению со строкой.
Примеры:
```javascript
    const parser = find('a');
    expect(parser.parse('abc')).toBe('a');
    expect(parser.parse('bac')).toBe(undefined);
```
```javascript
    const parser = find(/^[a-z]/);
    expect(parser.parse('abc')).toBe('abc');
    expect(parser.parse('bac')).toBe('bac');
    expect(parser.parse('1abc')).toBe(undefined);
```
```javascript
    const parser = find(/^[a-z]/).not(find('x'));
    expect(parser.parse('abc')).toBe('abc');
    expect(parser.parse('bacx')).toBe(undefined);
```
Символ "^" рекомендуется использовать для оптимизации регулярного выражения.

### any
**any** дает возможность найти одно из совпадений.
```javascript
    const parser = any(
        find('a'),
        find('c')
    );
    expect(parser.parse('a')).toBe('a');
    expect(parser.parse('c')).toBe('c');
    expect(parser.parse('b')).toBe(undefined);
```
```javascript
    const parser = any(
        find(/^[a-c]/),
        find(/^[e-g]/)
    ).not(find('abcefg'));
    expect(parser.parse('ab')).toBe('ab');
    expect(parser.parse('fg')).toBe('fg');
    expect(parser.parse('abcef')).toBe('abcef');
    expect(parser.parse('abcefg')).toBe(undefined);
```

### sequence
С помощью **sequence** можно строить последовательности
```javascript
    const parser = sequence(
        find('ab'),
        find(/^[c-e]+/),
        find(/^[0-9]/)
    );
    expect(parser.parse('abcc1')).toBe(['ab', 'cc', '1']);
    expect(parser.parse('abcc')).toBe(undefined);
```
```javascript
    const parser = sequence(
        find('ab'),
        find(/^[c-e]+/),
        find(/^[0-9]/)
    ).then(results => results.join(''));
    expect(parser.parse('abcc1')).toBe('abcc1');
    expect(parser.parse('abcc')).toBe(undefined);
```
В предыдущем примере вы можете видеть в действии полезный метод **then**, который есть у любого парсера. А так же, у любого парсера есть методы **not** и **useCache**. Они возвращают новый парсер, поэтому можно смело образовывать новые сущности, не трогая существующие:
```javascript
    const parser1 = find(/^[a-c]/),
        parser2 = parser1.not(find('b')),
        parser3 = parser1.then(result => result + '1'),
        parserCached = parser1.useCache();
    expect(parser1).not.toBe(parser2);
    expect(parser1).not.toBe(parser3);
    expect(parser1).not.toBe(parserCached);
```

### repeat
