/**
 * helden.js default UI extension focused on JQuery/Zepto API.
 * @author: Miere Liniel Teixeira <miere.teixeira@gmail.com>
 */
!function(){

	function wasDefined( value ){
		return ( value != undefined && value != null )
	}

	/**
	 * Defines if a view should be visible or not
	 */
	helden.select.extensions.visible = function( initialValue ){
		var isVisible = initialValue || false

		this.configure = function( view, model, value )
		{
			var method = function( v ){
				if ( wasDefined( v ) )
					setValue( v )
				return isVisible
			}

			function setValue( v ){
				var m = ( v == true )
					? view.show : view.hide
				m.call( view )
				isVisible = v
			}

			value = wasDefined( value ) ? value : isVisible
			method( value )
			return method
		}
	}

	/**
	 * Force a focus into an form element
	 */
	helden.select.extensions.focus = function(){

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
	helden.select.extensions.fadeout = function(){

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
	helden.select.extensions.fadein = function(){

		this.configure = function( view, model, value )
		{
			return function(){
				view.fadein.apply( view, arguments )
			}
		}
	}
}()