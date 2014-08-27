/**
 * @jsx React.DOM
 */


var IS_MOBILE = (
  navigator.userAgent.match(/Android/i)
    || navigator.userAgent.match(/webOS/i)
    || navigator.userAgent.match(/iPhone/i)
    || navigator.userAgent.match(/iPad/i)
    || navigator.userAgent.match(/iPod/i)
    || navigator.userAgent.match(/BlackBerry/i)
    || navigator.userAgent.match(/Windows Phone/i)
);

var CodeMirrorEditor = React.createClass({displayName: 'CodeMirrorEditor',
  componentDidMount: function() {
    if (IS_MOBILE) return;

    this.editor = CodeMirror.fromTextArea(this.refs.editor.getDOMNode(), {
      mode: 'javascript',
      lineNumbers: false,
      lineWrapping: true,
      smartIndent: false,
      matchBrackets: true,
      theme: 'solarized-light',
      readOnly: this.props.readOnly
    });
    this.editor.on('change', this.handleChange);
  },

  componentDidUpdate: function() {
    if (this.props.readOnly) {
      this.editor.setValue(this.props.codeText);
    }
  },

  handleChange: function() {
    if (!this.props.readOnly) {
      var source = this.editor.getValue();
      this.props.onChange && this.props.onChange(source);
    }
  },

  render: function() {
    // wrap in a div to fully contain CodeMirror
    var editor;
    if (IS_MOBILE) {
      editor = React.DOM.pre( {style:{overflow: 'scroll'}}, this.props.codeText);
    } else {
      editor = React.DOM.textarea( {ref:"editor", defaultValue:this.props.codeText} );
    }
    return (
      React.DOM.div( {style:this.props.style, className:this.props.className}, 
        editor
      )
    );
  }
});

var selfCleaningTimeout = {
  componentDidUpdate: function() {
    clearTimeout(this.timeoutID);
  },

  setTimeout: function() {
    clearTimeout(this.timeoutID);
    this.timeoutID = setTimeout.apply(null, arguments);
  }
};

var ReactPlayground = React.createClass({displayName: 'ReactPlayground',
  mixins: [selfCleaningTimeout],
  MODES: {JS: 'JS', PHP: 'PHP'},
  propTypes: {
    codeText: React.PropTypes.string.isRequired,
    transformer: React.PropTypes.func.isRequired,
    renderCode: React.PropTypes.bool
  },

  getInitialState: function() {
    return {
      mode: this.MODES.JS,
      code: this.props.codeText
    };
  },

  handleCodeChange: function(value) {
    this.setState({code: value});
    this.executeCode();
  },

  handleCodeModeSwitch: function(mode) {
    this.setState({mode: mode});
  },

  compileCode: function() {
    return this.props.transformer(this.state.code);
  },

  render: function() {
    var isPHP = this.state.mode === this.MODES.PHP;
    var compiledCode = '';
    if (window.noCatch) {
      //allow error to be thrown for debugging
      compiledCode = this.compileCode();
    } else {
      try {
        compiledCode = this.compileCode();
      } catch (e) {}
    }
    //for debugging
    window.output = compiledCode;

    var PHPContent =
      CodeMirrorEditor(
        {key:"php",
        className:"playgroundStage CodeMirror-readonly",
        onChange:this.handleCodeChange,
        codeText:compiledCode,
        readOnly:true,
        mode:'php'}
      );

    var JSContent =
      CodeMirrorEditor(
        {key:"js",
        onChange:this.handleCodeChange,
        className:"playgroundStage",
        codeText:this.state.code}
      );

    var JSTabClassName =
      'playground-tab' + (isPHP ? '' : ' playground-tab-active');

    var JSTab =
      React.DOM.div(
        {className:JSTabClassName,
        onClick:this.handleCodeModeSwitch.bind(this, this.MODES.JSX)},
          "Live Editor"
      )

    return (
      React.DOM.div( {className:"playground"}, 
        React.DOM.div(null, 
          JSTab
        ),
        React.DOM.div( {className:"playgroundCode"}, 
          isPHP ? PHPContent : JSContent
        ),
        React.DOM.div( {className:"playgroundPreview"}, 
          React.DOM.div( {ref:"mount"} )
        )
      )
    );
  },

  componentDidMount: function() {
    this.executeCode();
  },

  componentWillUpdate: function(nextProps, nextState) {
    // execute code only when the state's not being updated by switching tab
    // this avoids re-displaying the error, which comes after a certain delay
    if (this.state.code !== nextState.code) {
      this.executeCode();
    }
  },

  executeCode: function() {
    var mountNode = this.refs.mount.getDOMNode();

    try {
      React.unmountComponentAtNode(mountNode);
    } catch (e) { }

    try {
      var compiledCode = this.compileCode();
      if (this.props.renderCode) {
        React.renderComponent(
          CodeMirrorEditor( {codeText:compiledCode, readOnly:true} ),
          mountNode
        );
      } else {
        eval(compiledCode);
      }
    } catch (err) {
      this.setTimeout(function() {
        React.renderComponent(
          React.DOM.div( {className:"playgroundError"}, err.toString()),
          mountNode
        );
      }, 500);
    }
  }
});