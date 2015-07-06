/**
 * helden.js heroically born two way binding
 * @author: Miere Liniel Teixeira <miere.teixeira@gmail.com>
 */
window.helden = (function(){

	// constants
	var DO_NOTHING = function(){}
	var BINDABLE_ELEMENTS = [ "BUTTON", "INPUT", "TEXTAREA", "SELECT" ]

	function isFunction( obj ) {
		return (typeof obj) == 'function'
	}

	function wasDefined( value ){
		return ( value != undefined && value != null )
	}

	function makeModelObservable( model, selector ) {
		var view = selector ? $( selector ) : $( "body" )
		return makeModelObserveAView( model, view )
	}

	function makeModelObserveAView( model, view, target, parentModel ){
		target = target || model
		for ( var attr in model ) {
			var obj = model[attr]
			var defaultValue = target[attr]
			defaultValue = defaultValue == obj ? null : defaultValue
			if ( obj && isFunction( obj.configure ) ) {
				var objview = obj.selector ? view.find( obj.selector ) : view
				var resp = obj.configure( objview, target, defaultValue, parentModel )
				resp.$ = objview
				target[attr] = wrap( resp, target )
			} else if ( isFunction( obj ) )
				target[attr] = obj.bind( target )
		}
		return target
	}

  /**
   * Convert an abstract object into a valid extension.
   */
  function convertToExtension( extension ){

	extension.init = extension.init || DO_NOTHING
	extension.getter = extension.getter || DO_NOTHING
	extension.setter = extension.setter || DO_NOTHING

	function Extension(){}
	Extension.prototype = extension

    function getterAndSetter( v ){
      if ( arguments.length )
        extension.setter.apply( this, arguments )
      return extension.getter.apply( this )
    }

    function notifiableSetter( v ){
		if ( isFunction( this.param ) )
			v = this.param.apply( this.model )
		return getterAndSetter.call( this, v )
    }

    function getDslObject(){
      if ( extension.notifiable )
        return notifiableSetter.bind(this)
      return getterAndSetter.bind(this)
    }

    function configurer( initialValue ){

		this.configure = function( view, model, value, parentModel ) {
			var configuredExtension = new Extension()
			configuredExtension.param = initialValue
			if ( !extension.optimize )
				configuredExtension.view = view
			configuredExtension.model = model
			configuredExtension.parentModel = parentModel

			configuredExtension.init.call( this )
			var getterOrSetter = getDslObject.call( configuredExtension )
			getterOrSetter.call( configuredExtension, value || initialValue )

			return getterOrSetter
		}
    }

    return configurer
  }
  
	function as_extension( callable ){
		if ( isFunction( callable ) )
			return function(){
				var created = construct(callable, arguments)
				created.selector = this.selector
				return created
			}
		return function(){
			callable.selector = this.selector
			return callable
		}
	}
  
	function wrap( method, target ){
		var wrapped = method.bind( target )
		wrapped.is_wrapped = true
		wrapped.is_dom_event = method.is_dom_event
	  return wrapped
	}

	function unwrap( object ){
		
	  function is_valid( value ){
		  return value != undefined && value !== ""
	  }

	  function unwrap_array(object){
	    var arr = []
	    for ( var i=0; i<object.length; i++ )
	      var value = unwrap( object[i] )
	      if ( is_valid( value ) )
	        arr.push( value )
	    return arr
	  }

	  function unwrap_oarray(object){
	    var arr = []
	    for ( var i=0; i<object.length; i++ ){
	      var value = unwrap( object.get(i) )
	      if ( is_valid( value ) )
	        arr.push( value )
	    }
	    return arr
	  }

	  function unwrap_object( object ){
	    var obj = {}
	    for ( var attr in object ){
			if ( !H.unserializableAttributes[attr] ){
		      var value = unwrap( object[attr] )
		      if ( is_valid( value ) )
		        obj[attr] = value
			}
	    }
	    return obj
	  }

	  function unwrap_method( method ){
	    if ( method.is_wrapped && !method.is_dom_event )
	      return method()
	  }

	  if ( object instanceof helden.ObservableArray )
	    return unwrap_oarray( object )
	  else if ( object instanceof Array )
	    return unwrap_array( object )
	  else if ( (typeof object) == 'function' )
	    return unwrap_method( object )
	  else if ( (typeof object) == 'object' )
	    return unwrap_object( object )
	  else
	    return object
	}

	/**
	 * A reflective constructor instantiator
	 */
	function construct(constructor, args) {
		function F() {
			constructor.apply(this, args);
		}
		F.prototype = constructor.prototype;
		return new F();
	}

	/**
	 * observable implementation of array
	 */
	function ObservableArray( onAdd, onRemove, onUpdate ){
		this.onAdd = onAdd
		this.onRemove = onRemove
		this.onUpdate = onUpdate
		this.length = 0
		var counter = 0
		var array = []

		this.get = function( index ) {
			return array[ index ]
		}
		this.pushAll = function( items ) {
			for ( var i=0; i<items.length; i++ )
				this.push( items[i] )
		}
		this.push = function( item ) {
			var index = counter++
			var nitem = this.onAdd.call( array, index, item ) || item
			if ( nitem ) {
					array.push.call( array, nitem )
					this.length = array.length
			}
			return nitem
		}
		this.clear = function(){
			this.reset([])
		}
		this.remove = function( item ){
			var index = array.indexOf( item );
			return this.removeAt( index )
		}
		this.removeAt = function( index ){
			if ( index >= 0 ) {
				var item = array[ index ]
				array.splice( index, 1 )
				this.length = array.length
				this.onRemove.call( array, index, item )
			}
		}
		this.reset = function( arr ){
			for ( var i=0; i<this.length; i++ )
				this.remove( array[i] )
			for ( var i=0; i<arr.length; i++ )
				this.push( arr[i] )
		}
		this.sort = function( sortBy ) {
			array.sort( sortBy )
			this.onSort.call( array )
		}
		this.sortByKey = function( keyCallback ) {
			this.sort( compareByKey( keyCallback ) )
		}
	}

	function compareByKey( keyCallback ) {
		return function( a, b ) {
			var aKey = keyCallback( a )
			var bKey = keyCallback( b )
			if (aKey > bKey)
				return -1;
			if (aKey < bKey)
				return 1;
			return 0;
		}
	}

	/**
	 * Make the elements from a form bind its ID's elements against a model.
	 */
	function FormBinder( selector, attribute ) {
		var model = {}
		attribute = attribute || "id"
		this.selector = selector

		this.configure = function( view ) {
			bindModelToView( view )
			return function( v ){
				if ( v ) updateView( v )
				return model
			}
		}
		
		function updateView( v ){
			var value = null
			for ( var attr in model ){
				value = v[attr]
				if ( !wasDefined(value) ) value = ""
				model[attr](value)
			}
		}

		function bindModelToView( view ){
			view.find( "*["+ attribute +"]" )
				.each(function(){
					var defaultValue = (this.type == "checkbox" ? this.checked : this.value) || model[ this[attribute] ] || ""
					var m = new DomBinder().configure( $(this), model, defaultValue )
					model[ this[attribute] ] = m
				})
		}
	}

	/**
	 * Bind a view against an array of observable model.
	 */
	function ForEachBinder( selector, templateModel ) {
		var name = null
		var model = new ObservableArray()
		var onChange = DO_NOTHING
		var autoRemoveTemplate = true
		this.selector = selector

		this.onChange = function( callback ){
			if ( !isFunction( callback ) )
				throw "Callback should be a function"
			onChange = callback.bind( model )
			return this
		}

		this.autoRemoveTemplate = function( value ){
			if ( value != null && value != undefined )
				autoRemoveTemplate = value
			return this
		}

		this.configure = function( view, originalModel, defaultValue, parentModel ) {

			name = this.selector.replace(/[^a-zA-Z0-9]/g, '')
			var parent = view.parent()
			var template = view.clone()
			if ( autoRemoveTemplate )
				view.remove()

			model.onAdd = function( index, item ){
				var clone = template.clone()
				item.ID_ForEachBinder = name + index
				clone.attr( "id", name + index )
				makeModelObserveAView( templateModel, clone, item, originalModel )
				parent.append( clone )
				onChange( parentModel )
				return item
			}

			model.onRemove = function( index, item ){
				index = item.ID_ForEachBinder
				parent.find( "#" + index ).remove()
				onChange( parentModel )
			}

			model.onSort = function() {
				var current = null, last = null
				for ( var i=0; i<this.length; i++ ){
					var item = this[i]
					var index = item.ID_ForEachBinder
					current = parent.find( "#" + index )
					if ( last == null )
						parent.prepend( current )
					else
						last.after( current )
					last = current
				}
				onChange( parentModel )
			}

			return function( v ){
				if ( v )
					model.reset( v )
				return model
			}
		}
	}

	/**
	 * Make dom selected nodes binded against an observable model.
	 */
	function DomBinder( selector, callback ) {
		this.selector = selector

		function formatter(){
			if ( !callback ) return arguments
			var args = callback.apply(this, arguments)
			if ( !(args instanceof Array) )
				args = [args]
			return args
		}

		this.configure = function( element, model, value ) {
			var method = isTwoWayBindable( element )
				? makeTwoWayBindable( element )
				: makeOneWayBindable( element )
			method.is_wrapped = true
			if ( !isFunction( value ) )
				method( value )
			return method;
		}

		function makeTwoWayBindable( element ) {
			return ( element.attr("type") == "checkbox" )
				? makeCheckboxTwoWayBindable( element )
				: makeInputsTwoWayBindable( element )
		}

		function makeInputsTwoWayBindable( element ) {
			return function(){
				var args = formatter.apply( this, arguments )
				return element.val.apply( element, args )
			}
		}

		function makeCheckboxTwoWayBindable( element ) {
			return function( value ) {
				value = formatter( value )
				if ( value == undefined )
					return element.prop( "checked" )
				return element.prop( "checked", value )
			}
		}

		function makeOneWayBindable( element ) {
			return function(){
				var args = formatter.apply( this, arguments )
				return element.text.apply( element, args )
			}
		}

		function isTwoWayBindable( element ){
			var nodeName = element.prop("nodeName")
			return nodeName && BINDABLE_ELEMENTS.indexOf( nodeName.toUpperCase() ) >= 0
		}
	}

	/**
	 * Make a dom node listen to events and attach a callback to it
	 */
	function DomEventBinder( selector, event, callback ){
		this.selector = selector

		this.configure = function( view, model, defaultValue, parentModel ){
			function eventCallback(){
				var args = [ view, parentModel ]
				for ( var i=0;i<arguments.length; i++ )
					args.push( arguments[i] )
				return callback.apply( model, args )
			}
			eventCallback.is_dom_event = true
			view.on( event, eventCallback )
			return eventCallback
		}
	}

	/**
	 * Selector
	 */
	function Selector( selector) {
		this.selector = selector

		for ( var attr in Selector.extensions ){
			this[ attr ] = function( attr ){
					return function(){
						var extension = convertToExtension( Selector.extensions[attr] )
						var ext = construct( extension, arguments )
						ext.selector = selector
						return ext
				}
			}( attr )
		}
	}

	/**
	 * Raw Selector API
	 */
	Selector.prototype = {

		/**
		 * 
		 */
		bind: function( callback ){
			return new DomBinder( this.selector, callback )
		},

		/**
		 * Bind all input/textarea/select/radio/checkbox ids found inside nodes retrieved by current selector
		 */
		bindIds: function(){
			return new FormBinder( this.selector )
		},

		/**
		 * Bind all input/textarea/select/radio/checkbox names found inside nodes retrieved by current selector
		 */
		bindNames: function(){
			return new FormBinder( this.selector, "name" )
		},

		/**
		 * 
		 */
		on: function(){
			if ( arguments.length == 2 )
				return new DomEventBinder( this.selector, arguments[0], arguments[1] )
			throw "Invalid arguments for event binding('on' method): " + arguments
		},

		/**
		 * Bind all ids found inside nodes retrieved by current selector
		 */
		forEach: function( model ){
			return new ForEachBinder( this.selector, model )
		}
	}

	/**
	 * Selector DSL API extensions
	 */
	Selector.extensions = {

		accessor: {
			getter: function(){
				return this.value
			},
			setter: function( v ){
				this.value = v
			}
		},

		bindAttr: {
			getter: function(){
				return this.view.attr( this.param )
			},
			setter: function( v ){
				this.view.attr( this.param, v )
			}
		},

		bindProp:{
			getter: function(){
				return this.view.prop( this.param )
			},
			setter: function( v ){
				this.view.prop( this.param, v )
			}
		},

		bindCss:{
			getter: function(){
				return this.view.css( this.param )
			},
			setter: function( v ){
				this.view.css( this.param, v )
			}
		}
	}

	var helden = {
		Selector: Selector,
		DomBinder: DomBinder,
		DomEventBinder: DomEventBinder,
		ForEachBinder: ForEachBinder,
		FormBinder: FormBinder,
		ObservableArray: ObservableArray,

		dsl: {
			unserializableAttributes:{
				toJS: true,
				ID_ForEachBinder: true
			},
			observable: makeModelObservable,
			observeAView: makeModelObserveAView,
			on: Selector.prototype.on,
			bind: Selector.prototype.bind,
			wasDefined: wasDefined,
			isFunction: isFunction,
			toJS: unwrap,
			extension: as_extension,
			select: function()
			{
				if ( arguments.length == 1 && ( typeof arguments[0] ) == "string" )
					return new Selector( arguments[0] )
				throw "Invalid syntax"
			}
		}
	}

	Selector.apply( helden.dsl )
	return helden
})()

window.H = helden.dsl
if ( (typeof useGlobals) != "undefined" )
	for ( var attr in H )
		if ( !window[attr] )
			window[attr] = H[attr]
