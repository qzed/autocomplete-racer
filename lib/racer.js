'use babel';

import {BufferedProcess, Point} from 'atom';


// MATCH text;snippet;line;column;sourcefile;type;context;"documentation"
const REGEXP_MATCH = /^MATCH\s+([^;]+);([^;]+);(\d+);(\d+);((?:[^;]|\\;)+);([^;]+);((?:[^;]|\\;)+)?;\"([\S\s]+)?\"/;

// MATCH text,line,column,sourcefile,type,context
const REGEXP_DEFMATCH = /^MATCH\s+([^,]+),(\d+),(\d+),((?:[^,]|\\,)+),([^,]+),((?:[^,]|\\,)+)/;


function buildHyperclickResponse(data, range, itembuilder, callback) {
    let matches = [];

    let lines = data.split(/(\r?\n)/g);
    for (let line of lines) {
        if (line.startsWith('MATCH')) {
            let match = parseDefMatch(line);

            if (match) {
                matches.push(match);
            }
        }
    }

    if (matches.length <= 0) {
        return null;

    } else if (matches.length == 1) {
        return {
            range: range,
            callback: () => {
                callback(matches[0].source, new Point(matches[0].row - 1, matches[0].column));
            }
        };

    } else {
        let results = [];

        for (let match of matches) {
            let item = itembuilder(match);
            item.callback = () => {
                callback(match.source, new Point(match.row - 1, match.column));
            };

            results.push(item);
        }

        return {
            range: range,
            callback: results,
        };
    }
}

function parseDefMatch(line) {
    const match = line.replace(/\\'/g, '\'')
            .replace(/\\;/g, ';')
            .match(REGEXP_DEFMATCH);

    if (!match) {
        atom.notifications.addError('Failed to parse racer "find-definition" response', {
            dismissable: true,
            detail: line,
        });
        return null;
    }

    return {
        text:     match[1],
        row:      parseInt(match[2]),
        column:   parseInt(match[3]),
        source:   match[4].replace(/\\,/g, ','),
        type:     match[5],
        context:  match[6] ? match[6].replace(/\\,/g, ',') : null,
    };
}


function buildAutocompleteResponse(data, builder) {
    let result = [];

    let lines = data.split(/(\r?\n)/g);
    for (let line of lines) {
        if (line.startsWith('MATCH')) {
            let match = parseMatch(line);

            if (match) {
                result.push(builder(match));
            }
        }
    }

    return result;
}

function parseMatch(line) {
    const match = line.replace(/\\'/g, '\'').match(REGEXP_MATCH);

    if (!match) {
        atom.notifications.addError('Failed to parse racer "complete-with-snippet" response', {
            dismissable: true,
            detail: line,
        });
        return null;
    }

    let doc = null;
    if (match[8]) {
        doc = match[8].replace(/\\;/g, ';')
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');
    }

    return {
        text:     match[1],
        snippet:  match[2] ? match[2].replace(/\\;/g, ';') : null,
        row:      parseInt(match[3]),
        column:   parseInt(match[4]),
        source:   match[5].replace(/\\;/g, ';'),
        type:     match[6],
        context:  match[7] ? match[7].replace(/\\;/g, ';') : null,
        doc:      doc,
    };
}


function spawnGenericRacerProcess(command, subcommand, editor, row, column, resolve, reject) {
    let out = '';
    let err = '';

    let process = new BufferedProcess({
        command: command,
        args: [subcommand, row + 1, column, editor.getPath(), '-'],

        stdout(data) {
            out += data;
        },

        stderr(data) {
            err += data;
        },

        exit(code) {
            if (code === 0) {
                resolve(out);
            } else {
                reject(code, err);
            }
        },
    });

    process.process.stdin.setEncoding = 'utf-8';
    process.process.stdin.write(editor.getText());
    process.process.stdin.end();
}


function findClosingIndex(string, open, close, start) {
    let idx = start;
    let depth = 1;

    while (idx < string.length) {        // find the ending '>'
        const nextend = string.indexOf(close, idx);
        const nextstart = string.indexOf(open, idx);

        if (nextstart < 0) {
            idx = nextend + 1;
            return idx;

        } else if (nextstart < nextend) {
            idx = nextstart + 1;
            depth += 1;

        } else {
            idx = nextend + 1;
            depth -= 1;

            if (depth === 0) {
                return idx;
            }
        }
    }

    return -1;
}

export function getExtendedFunctionInfo(match) {
    let signature = match.context;

    // detect and remove qualifier
    let tmp = signature.match(/(?:(pub)\s+)?(?:(unsafe)\s+)?fn\s+(.*)/);
    let visibility = tmp[1];
    let unsafety = tmp[2];
    signature = tmp[3];

    // find function name
    let startgen = signature.indexOf('<');
    let startarg = signature.indexOf('(');

    let idend = startgen > 0 ? Math.min(startgen, startarg) : startarg;
    let identifier = signature.slice(0, idend);
    signature = signature.slice(idend).trim();

    // find generics
    let generics = null;
    if (startgen > 0 && startgen < startarg) {
        let idx = findClosingIndex(signature, '<', '>', 1);

        generics = signature.slice(0, idx);
        signature = signature.slice(idx).trim();
    }

    // find arguments
    let args = null;
    {
        let idx = findClosingIndex(signature, '(', ')', 1);

        args = signature.slice(0, idx);
        signature = signature.slice(idx).trim();
    }

    // find return type and where clause
    let returntype = null;
    let where = null;
    {
        let splits = signature.split(/\s+where\s+/, 1);

        if (splits.length == 1) {
            if (signature.startsWith('where')) {
                where = signature;
            } else {
                returntype = signature;
            }
        } else {
            returntype = splits[0];
            returntype = splits[1];
        }

        if (returntype) {
            returntype = returntype.slice(2).trim();    // remove '->'
        }
    }

    return {
        identifier: identifier,
        visibility: visibility,
        unsafety:   unsafety,
        args:       args,
        returntype: returntype,
        generics:   generics,
        where:      where,
    };
}

export function cleanupDocString(docstr) {
    if (!docstr) return null;

    const lines = docstr.split(/\r?\n/);

    let doc = '';
    let iscode = false;
    for (let line of lines) {
        if (/^\s*```/.test(line)) {
            iscode = !iscode;
            doc += line + '\n';
        } else if (!(iscode && /^\s*#\s+/.test(line))) {
            doc += line + '\n';
        }
    }

    return doc;
}


export class AutocompleteClient {
    constructor() {}
    dispose() {}

    getSuggestions(editor, row, column, builder, resolve) {
        // TODO: suppress prev. completions?

        let process = spawnGenericRacerProcess('racer', 'complete-with-snippet', editor, row, column, (out) => {
            resolve(buildAutocompleteResponse(out, builder));

        }, (code, err) => {
            atom.notifications.addError(`Racer error (code: ${code})`, {
                dismissable: true,
                detail: err,
            });

            resolve();
        });
    }
}

export class HyperclickClient {
    constructor() {}
    dispose() {}

    getSuggestion(editor, range, itembuilder, callback, resolve) {
        let row = range.end.row;
        let column = range.end.column;

        let process = spawnGenericRacerProcess('racer', 'find-definition', editor, row, column, (out) => {
            let response = buildHyperclickResponse(out, range, itembuilder, callback);
            if (response) {
                resolve(response);
            } else {
                resolve();
            }

        }, (code, err) => {
            atom.notifications.addError(`Racer error (code: ${code})`, {
                dismissable: true,
                detail: err,
            });

            resolve();
        });
    }
}
