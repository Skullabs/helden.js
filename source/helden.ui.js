/**
 * helden.js default UI extension focused on JQuery/Zepto API.
 * @author: Miere Liniel Teixeira <miere.teixeira@gmail.com>
 */
!function(){

	/**
	 * Defines if a view should be visible or not
	 */
	helden.Selector.extensions.visible = {
		notifiable: true,
		setter: function( v ){
			var m = v ? this.view.show : this.view.hide
			m.call( this.view )
			this.isVisible = v
		},
		getter: function(){
			return this.isVisible
		}
	}

	/**
	 * Force a focus into an form element
	 */
	helden.Selector.extensions.focus = {
		getter: function(){
			this.view.focus()
		}
	}

	/**
	 * Apply fadeout effect in dom element
	 */
	helden.Selector.extensions.fadeout = {
		getter: function(){
			this.view.fadeout()
		}
	}

	/**
	 * Apply fadein effect in dom element
	 */
	helden.Selector.extensions.fadein = {
		getter: function(){
			this.view.fadein()
		}
	}
}()
