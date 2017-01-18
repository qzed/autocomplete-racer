'use babel';

import AutocompleteProvider from './autocomplete-provider';
import HyperclickProvider from './hyperclick-provider';


module.exports = {
    config: {
        autocomplete: {
            type: 'object',
            properties: {
                general: {
                    order: 1,
                    title: 'General',
                    type: 'object',
                    properties: {
                        exclude: {
                            order: 1,
                            title: 'Exclude Scopes',
                            description: 'Exclude the specified scopes from autocompletion.',
                            type: 'string',
                            default: '.source.rust .comment, .source.rust .string',
                        },
                        inclusionPriority: {
                            order: 2,
                            title: 'Inclusion Priority',
                            description: 'Priority of this provider over other providers. The value of the ' +
                                    'default provider is 0.',
                            type: 'integer',
                            default: 1,
                        },
                        excludeLowerPriority: {
                            order: 3,
                            title: 'Exclude lower priority Provider',
                            description: 'Exclude any provider with a lower inclusion priority.',
                            type: 'boolean',
                            default: false,
                        },
                        suggestionPriority: {
                            order: 4,
                            title: 'Suggestion Priority',
                            description: 'Priority of the suggestions of this provider. The value of the ' +
                                    'default provider is 1',
                            type: 'integer',
                            default: '2',
                        },
                        triggerRegExp: {
                            order: 5,
                            title: 'Trigger Expression',
                            description: 'Regular expression specifying after which prefixes automatic ' +
                                    'completion triggers. By default, autocomplete-plus triggers after ' +
                                    'expressions including special characters, such as semikolons. ' +
                                    'This regular expression is used to suppress said behaviour and only ' +
                                    'allow automatic triggering after matching prefixes. This expression ' +
                                    'does not suppress manual activation (e. g. using the designated key-stroke).',
                            type: 'string',
                            default: '^([.\\s]|(::)|([a-zA-Z_]\\w*))$'
                        },
                    },
                },

                documentation: {
                    order: 2,
                    title: 'Documentation',
                    type: 'object',
                    properties: {
                        show: {
                            title: 'Show Documentation',
                            description: 'Display the Rust documentation of the selected item.',
                            type: 'boolean',
                            default: 'true',
                        },
                    },
                },

                functions: {
                    order: 3,
                    title: 'Functions',
                    type: 'object',
                    properties: {
                        signatureInDoc: {
                            title: 'Include Signature in Documentation',
                            description: 'Include the function signature as prefix of the documentation.',
                            type: 'boolean',
                            default: 'true',
                        },
                    },
                },
            },
        },
        hyperclick: {
            type: 'object',
            properties: {
                exclude: {
                    order: 1,
                    title: 'Exclude Scopes',
                    description: 'Exclude the specified scopes from hyperclick.',
                    type: 'string',
                    default: '.source.rust .comment, .source.rust .string, .source.rust .keyword, ' +
                            '.source.rust .meta, .source.rust .constant.numeric',
                },
            },
        },
    },

    activate(state)  {
        this.autocomplete = new AutocompleteProvider();
        this.hyperclick = new HyperclickProvider();
    },

    deactivate()  {
        if (this.autocomplete) {
            this.autocomplete.dispose();
            this.autocomplete = null;
        }

        if (this.hyperclick) {
            this.hyperclick.dispose();
            this.hyperclick = null;
        }
    },

    getAutocompleteProvider() {
        return this.autocomplete;
    },

    getHyperclickProvider() {
        return this.hyperclick;
    }
};
