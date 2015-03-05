/**
 * helden.js default UI extension focused on JQuery/Zepto API.
 * @author: Miere Liniel Teixeira <miere.teixeira@gmail.com>
 */
!function(){

	/**
	 * Defines if a view should be visible or not
	 */
	helden.Selector.extensions.visible = function( initialValue ){
		var isVisible = initialValue || false

		this.configure = function( view, model, value )
		{
			var method = function( v ){
				if ( H.wasDefined( v ) )
					setValue( v )
				return isVisible
			}

			function setValue( v ){
				var m = ( v == true )
					? view.show : view.hide
				m.call( view )
				isVisible = v
			}

			value = H.wasDefined( value ) ? value : isVisible
			method( value )
			return method
		}
	}

	/**
	 * Force a focus into an form element
	 */
	helden.Selector.extensions.focus = function(){

		this.configure = function( view, model, value )
		{
			return function(){
				view.focus()
			}
		}
	}

	/**
	 * Apply fadeout effect in dom element
	 */
	helden.Selector.extensions.fadeout = function(){

		this.configure = function( view, model, value )
		{
			return function(){
				view.fadeout.apply( view, arguments )
			}
		}
	}

	/**
	 * Apply fadein effect in dom element
	 */
	helden.Selector.extensions.fadein = function(){

		this.configure = function( view, model, value )
		{
			return function(){
				view.fadein.apply( view, arguments )
			}
		}
	}
}()
