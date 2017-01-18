'use babel';

import {AutocompleteClient, getExtendedFunctionInfo, cleanupDocString} from './racer';
import {CompositeDisposable} from 'atom';


const ICONS = {
    Struct:      '<span class="icon-letter">S</span>',
    Module:      '<i class="icon-package"></i>',
    MatchArm:    '<span class="icon-letter">v</span>',
    Function:    '<span class="icon-letter">fn</span>',
    Crate:       '<i class="icon-package"></i>',
    Let:         '<span class="icon-letter">v</span>',
    IfLet:       '<span class="icon-letter">v</span>',
    WhileLet:    '<span class="icon-letter">v</span>',
    For:         '<span class="icon-letter">v</span>',
    StructField: '<span class="icon-letter">v</span>',
    Impl:        '<span class="icon-letter">I</span>',
    TraitImpl:   '<span class="icon-letter">I</span>',
    Enum:        '<span class="icon-letter">E</span>',
    EnumVariant: '<span class="icon-letter">e</span>',
    Type:        '<span class="icon-letter">t</span>',
    FnArg:       '<span class="icon-letter">v</span>',
    Trait:       '<span class="icon-letter">T</span>',
    Const:       '<span class="icon-letter">c</span>',
    Static:      '<span class="icon-letter">s</span>',
    Macro:       '<span class="icon-letter">f!</span>',
    Builtin:     '<span class="icon-letter">b</span>',
};


export default class AutocompleteProvider {
    constructor() {
        this._client = new AutocompleteClient();
        this._subscriptions = new CompositeDisposable();

        this.selector = '.source.rust';

        this._subscriptions.add(atom.config.observe(
                'autocomplete-racer.autocomplete.general.exclude', {}, (value) =>
        {
            this.disableForSelector = value;
        }));

        this._subscriptions.add(atom.config.observe(
                'autocomplete-racer.autocomplete.general.inclusionPriority', {}, (value) =>
        {
            this.inclusionPriority = value;
        }));

        this._subscriptions.add(atom.config.observe(
                'autocomplete-racer.autocomplete.general.excludeLowerPriority', {}, (value) =>
        {
            this.excludeLowerPriority = value;
        }));

        this._subscriptions.add(atom.config.observe(
                'autocomplete-racer.autocomplete.general.suggestionPriority', {}, (value) =>
        {
            this.suggestionPriority = value;
        }));

        this._subscriptions.add(atom.config.observe(
                'autocomplete-racer.autocomplete.general.triggerRegExp', {}, (value) =>
        {
            try {
                this._triggerRegExp = new RegExp(value);
            } catch (err) {
                atom.notifications.addError(
                        'Invalid value for autocomplete-racer.autocomplete.general.triggerRegExp. ' +
                        'Falling back to default value.',
                {
                    dismissable: true,
                    detail: value,
                });

                this._triggerRegExp = /^([.\s]|(::)|([a-zA-Z_]\w*))$/;
            }
        }));

        this._subscriptions.add(atom.config.observe(
                'autocomplete-racer.autocomplete.documentation.show', {}, (value) =>
        {
            this._showDoc = value;
        }));

        this._subscriptions.add(atom.config.observe(
                'autocomplete-racer.autocomplete.functions.signatureInDoc', {}, (value) =>
        {
            this._functionsSignatureInDoc = value;
        }));

    }

    dispose() {
        this._client.dispose();
        this._subscriptions.dispose();
    }


    getSuggestions({editor, bufferPosition, prefix, activatedManually}) {
        if (!activatedManually && !this._triggerRegExp.test(prefix))
            return;

        return new Promise((resolve) => {
            this._client.getSuggestions(editor, bufferPosition.row, bufferPosition.column, (match) => {

                let left = null;
                let text = null;
                let right = null;
                let doc = null;

                if (match.type == 'Function') {
                    let fn = getExtendedFunctionInfo(match);

                    if (fn.visibility && fn.unsafety) {
                        left = fn.visibility + ' ' + fn.unsafety;
                    } else if (fn.visibility) {
                        left = fn.visibility;
                    } else if (fn.unsafety) {
                        left = fn.unsafety;
                    }

                    text = fn.identifier + (fn.generics || '') + fn.args;

                    if (fn.returntype && fn.where) {
                        right = '-> ' + fn.returntype + ' ' + fn.where;
                    } else if (fn.returntype) {
                        right = '-> ' + fn.returntype;
                    } else if (fn.where) {
                        right = fn.where;
                    }

                    if (this._functionsSignatureInDoc) {
                        let signature = (left || '') + ' ' + text + ' ' + (right || '');
                        doc = '`' + signature + '`';
                    }

                } else {
                    text = match.text;
                    right = match.type;
                }

                if (this._showDoc) {
                    let docstr = cleanupDocString(match.doc);
                    if (doc && docstr) {
                        doc += '\n\n' + docstr;
                    } else {
                        doc = docstr;
                    }
                }

                return {
                    snippet:             match.snippet,
                    displayText:         text,
                    leftLabel:           left,
                    rightLabel:          right,
                    type:                match.type,
                    iconHTML:            ICONS[match.type],
                    descriptionMarkdown: doc,
                };
            }, resolve);
        });
    }
}
