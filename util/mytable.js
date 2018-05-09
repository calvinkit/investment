var Table = require('easy-table');

class NewTable extends Table {
    static Thousand(digits) {
        return function(val, width) {
            if (val == null) return ''
                if (typeof val != 'number')
                    throw new Error(''+val + ' is not a number')
                        var str = digits == null ? val+'' : val.toFixed(digits)
                        return Table.padLeft(str, width)
        }
    }

    static Number(digits) {
        return function(val, width) {
            if (val == null) return ''
                if (typeof val != 'number')
                    throw new Error(''+val + ' is not a number')
                        var str = digits == null ? val+'' : val.toFixed(digits)
                        return Table.padLeft(str, width)
        }
    }
}

module.exports = NewTable;
