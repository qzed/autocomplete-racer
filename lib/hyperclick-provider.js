'use babel';

import {HyperclickClient} from './racer';
import path from 'path';
import {Selector} from 'selector-kit';
import {CompositeDisposable} from 'atom';


export default class HyperclickProvider {
    constructor() {
        this._client = new HyperclickClient();
        this._subscriptions = new CompositeDisposable();

        this.providerName = 'autocomplete-racer';
        this.priority = 1;
        this.wordRegExp = /\b\w+\b/g;

        this._subscriptions.add(atom.config.observe('autocomplete-racer.hyperclick.exclude', {}, (value) => {
            try {
                this.exclude = Selector.create(value);
            } catch (err) {
                atom.notifications.addError(
                    "Invalid value for autocomplete-racer.hyperclick.exclude, falling back to default.", {
                    dismissable: true,
                    detail: value,
                });
                const fallback = '.source.rust .comment, .source.rust .string, .source.rust .keyword, ' +
                        '.source.rust .meta, .source.rust .constant.numeric';
                this.exclude = Selector.create(fallback);
            }
        }));
    }

    dispose() {
        this._client.dispose();
        this._subscriptions.dispose();
    }


    getSuggestionForWord(editor, text, range) {
        // filter grammar scopes
        if (editor.getGrammar().scopeName.indexOf('source.rust') < 0)
            return;

        let scope = editor.scopeDescriptorForBufferPosition(range.start);
        let chain = scope.getScopeChain();

        for (let selector of this.exclude) {
            if (selector.matches(chain)) {
                return;
            }
        }

        // find definition
        return new Promise((resolve) => {
            this._client.getSuggestion(editor, range, (match) => {
                return {
                    title:      match.type,
                    rightLabel: `${path.basename(match.source)} (l. ${match.row})`,
                };
            }, this.goToDefinition, resolve);
        });
    }

    goToDefinition(file, position) {
        atom.workspace.open(file).then((editor) => {
            editor.setCursorBufferPosition(position);
            editor.scrollToCursorPosition();
        });
    }
}
