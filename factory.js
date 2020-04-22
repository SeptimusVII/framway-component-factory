module.exports = function(app){
	var Factory = Object.getPrototypeOf(app).Factory = new app.Component("factory");
	// Factory.debug = true;
	Factory.createdAt      = "2.0.0";
	Factory.lastUpdate     = "2.0.0";
	Factory.version        = "1";
	Factory.factoryExclude = true;
	Factory.loadingMsg     = (!app.components.includes('tabs')?"This component require the following components to work properly: \n - tabs":null);
	Factory.requires	   = ['tabs'];

	Factory.prototype.onResize = function(){
		var factory = this;
		factory.$tabs.find('.tab.editor').removeClass('cols-1');
		factory.$constructor.removeClass('cols-1');
		if(factory.$constructor.innerWidth() < 450)
			factory.$tabs.find('.tab.editor').addClass('cols-1');
		if(factory.$constructor.innerWidth() < 400)
			factory.$constructor.addClass('cols-1');
	}
	Factory.prototype.onCreate = function(){
		var factory = this;
		factory.$select = $('<select data-component class="factory__select">/select>');
		factory.$sampler = $('<div class="factory__sampler hidden"></div>');
		factory.$editor = $('<div class="factory__editor"><button class="copy">Copy</button><textarea></textarea></div>');
		factory.$constructor = $('<div class="factory__constructor"></div>');
		factory.$infos = $(require('html-loader!./templates/infos.html'));
		factory.$tabs = $(require('html-loader!./templates/tabs.html'));
		if(typeof app.Tabs == 'function'){
			factory.$tabs.tabs();
			if (typeof app.updateUrlNavigation != 'undefined') {
				factory.$tabs.find('.tabs__nav button').on('click',function(){ // update url
					setTimeout(function(){app.updateUrlNavigation(factory.getNavState())});
				});
			}
		}

		if (app.components.length > 1) {
			for(var item of app.components){
				if (!app[app.utils.getClassName(item)].factoryExclude)
					factory.$select.append('<option value="'+item+'">'+app.utils.getClassName(item)+'</option>');
			}
			factory.$el.append(factory.$select);
			factory.$el.append(factory.$sampler);
			factory.$el.append(factory.$tabs);
			factory.$tabs.find('.tab.editor').append(factory.$editor).append($('<div></div>').append(factory.$constructor));
			factory.$tabs.find('.tab.about').append(factory.$infos);
		} else {
			factory.$el.append('<p class="error">No component available</p>');
		}

		// main select management
		factory.$select.on('change', function(){factory.updateDisplay()});

		// text editor management
	    var timerEdit,timerEditValue;
		var editorText = factory.$editor.find('textarea').val();
		factory.$editor.find('textarea').on('change keyup',function(e,forced){
			timerEditValue = 500;
			if(forced) 
				timerEditValue = 0;
			clearTimeout(timerEdit);
			timerEdit = setTimeout(function(){
				var val = factory.$editor.find('textarea').val();
				if(val != editorText || forced){
					editorText = val;
					factory.$sampler.html(val);
				}
			},timerEditValue);
			this.style.height = "auto";
	     	this.style.height = (this.scrollHeight + 10) + "px";
		});
		factory.$editor.find('.copy').on('click',function(){
			var elem = $(this).parent().find('textarea').get(0);
	     	if(app.utils.copyToClipboard(elem))
	        	notif_fade.success('Copied to clipboard !');
		});


		// constructor events
	  	$('body').on('change','.factory__constructor .select',function(e){
	  		factory.applyConstructorChanges($(this));
	  	});
	  	$('body').on('click','.factory__constructor .checkbox',function(e){
	  		factory.applyConstructorChanges($(this));
	  	});
	  	$('body').on('change','.factory__constructor .number',function(e){
	  		factory.applyConstructorChanges($(this));
	  	});
	  	
		  	
		factory.updateDisplay(false);
	  	factory.onResize();
	}

	Factory.prototype.updateDisplay = function(updateUrl = true){
		var factory = this;
		if (factory.$select.val() != ''){
			var componentName = factory.$select.val();
			var component = $('<div>'+require('html-loader!../'+componentName+'/sample.html')+'</div>');
			factory.$tabs.removeClass('hidden');
			factory.$constructor.removeClass('hidden');
			factory.$tabs.find('.tab.editor').removeClass('cols-1');
			factory.$sampler.removeClass('hidden');
			
			factory.$infos.find('.name').html(app.utils.getClassName(componentName) || '');
			factory.$infos.find('.cssClass').html(componentName || '');
			factory.$infos.find('.version__value').html(app[app.utils.getClassName(componentName)].version || '');
			factory.$infos.find('.createdAt').html(app[app.utils.getClassName(componentName)].createdAt || '');
			factory.$infos.find('.lastUpdate').html(app[app.utils.getClassName(componentName)].lastUpdate || '');
			factory.$infos.find('.loadingMsg').html(app[app.utils.getClassName(componentName)].loadingMsg || '');

			if (component.find('constructor').length) 
				factory.$constructor.html(getConstructor(component.find('constructor').remove()));
			else {
				factory.$constructor.addClass('hidden').html('');
				factory.$tabs.find('.tab.editor').addClass('cols-1');
			}
			factory.$editor.find('textarea').val(component.get(0).innerHTML);
			factory.$constructor.find('.select,.number').trigger('change');
			factory.$constructor.find('.checkbox').each(function(){
				if($(this).data('selected'))
		    		$(this).trigger('click');
			});
			factory.$editor.find('textarea').trigger('change',true);
		}
		else{
			factory.$editor.find('textarea').val('').trigger('change',true);
			factory.$tabs.addClass('hidden');
			factory.$constructor.addClass('hidden').html('');
			factory.$tabs.find('.tab.editor').addClass('cols-1');
			factory.$sampler.addClass('hidden');
		}
		// update url
		if(updateUrl && typeof app.updateUrlNavigation != 'undefined')
			app.updateUrlNavigation(factory.getNavState());
	}

	Factory.prototype.getNavState = function(){
		var factory = this;
		var objNav = {framnav: 'factory'}
		if (factory.$select.val() != '') {
			objNav.component = factory.$select.val();
			objNav.tab = factory.$tabs.find('.tabs__nav button.active').attr('data-tab');
		} else {
			factory.$tabs.addClass('hidden');
			factory.$constructor.addClass('hidden').html('');
			factory.$tabs.find('.tab.editor').addClass('cols-1');
			factory.$sampler.addClass('hidden');
		}
		return objNav;
	}

	Factory.prototype.applyConstructorChanges = function($input){
		var factory = this;

		var $editor  = factory.$editor.find('textarea');
		var selector = $input.attr('name').split(',')[0];
		var attr     = $input.attr('name').split(',')[1];
	    var dummy    = $($editor.val()).wrapAll('<div></div>');

	    var match = false;
	    var value = $input.val();
		if ($input.hasClass('select')) {
			match = [];
	      	$input.find('option').each(function(){
	       		if(this.value != '')
	         		match.push(this.value);
	      	});
	     	match = match.join(' ');
		} else if($input.hasClass('checkbox') && value == "undefined"){
	      value = $input.isChecked();
	    }
	    else if($input.hasClass('checkbox') && value != "undefined" && attr != "class"){
	      if($input.isChecked()) value = $input.val();
	      else value = '';
	    } else if($input.hasClass('number')){
	    	match = [];
	    	var prefix = $input.data('prefix') || '';
	      	for (var i = $input.attr('min'); i <= $input.attr('max'); i++) 
	        	match.push(prefix+i);
	     	match = match.join(' ');
	      	if($input.val())
	        	value = prefix+$input.val();
	    }

		if(attr == 'class'){
	      	if(match)
	        	dummy.parent().find('.'+selector).removeClass(match);
	      	dummy.parent().find('.'+selector).toggleClass(value);
	    } else {
	      	dummy.parent().find('.'+selector).attr(attr,value);
	    }

	    $editor.val(dummy.parent().get(0).innerHTML).trigger('keyup');
	};

	var arrSpecials = ['#colors','#breakpoints'];
	var getConstructor = function(constructor){
		var result = '';
		constructor.find('field').each(function(){
			var field = {};
			var inputGroup = '';
			for(var attr of $(this).get(0).attributes)
				field[attr.name] = attr.value;
			field.id = constructor.attr('component') +','+ field.target +','+ field.label.replace(/ /g,'-').toLowerCase();
			
			for(var special of arrSpecials){
				if (field.values && field.values.indexOf(special) != -1)
					field.values = getSpecials(special,field.values)
				if (field.labels && field.labels.indexOf(special) != -1)
					field.labels = getSpecials(special,field.labels)
			}

			if (field.type!='separator'){
				inputGroup += '<div class="form-group">';
				if (field.helper && field.helper != ''){
					inputGroup += '<i class="factory__helper__icon fas fa-question-circle"></i>';
	              	inputGroup += '<div class="factory__helper__text">'+field.helper+'</div>';
				}
			}
			switch(field.type){
				case 'separator': 
					inputGroup += '<p class="separator">'+field.label+'</p>';
				break;
				case 'select': 
					inputGroup += '<label for="'+field.id+'">'+field.label+'</label>'
								+ '<select class="'+field.type+'" name="'+field.id+'" id="'+field.id+'">'
								+ '<option value=""> - </option>';
					for(var i in field.values.split(','))
						inputGroup += '<option value="'+(field.prefix?field.prefix:'')+field.values.split(',')[i]+'"'+(field.selected == field.values.split(',')[i]?'selected':'')+'>'+field.labels.split(',')[i]+'</option>';
					inputGroup += '</select>';
				break;
				case 'checkbox':
					inputGroup += '<input type="checkbox" value="'+(field.prefix?field.prefix:'')+field.value+'" class="'+field.type+'" name="'+field.id+'" id="'+field.id+'" data-selected="'+field.selected+'" />'
								+ '<label for="'+field.id+'">'+field.label+'</label>'
				break;
				case 'number':
					var range = field.range.split('-');
					inputGroup += '<label for="'+field.id+'">'+field.label+'</label>'
								+ '<input type="number" min="'+range[0]+'" max="'+range[1]+'" '+(field.prefix?'data-prefix="'+field.prefix+'"':'')+' class="'+field.type+'" name="'+field.id+'" id="'+field.id+'" value="'+field.value+'" />'
				break;
				default: break;
			}
			if (field.type!='separator')
				inputGroup += '</div>';
			result += inputGroup;
		});
		return result;
	}

	var getSpecials = function(special,base){
		var result = [];
		base = base.replace(special,'');
		for(var item in app.styles[special.replace('#','')])
			result.push(base+item);
		return result.join(',');
	}

	return Factory;
}