Ext.define('CustomApp', {
	extend : 'Rally.app.App',
	componentCls : 'app',

	getSettingsFields : function() {
		return [ {
			name : 'IncludeNullTargetProjMilestone',
			xtype : 'rallycheckboxfield',
			fieldLabel : '',
			boxLabel : 'Include Milestones with All Projects in Research and Development Workspace'
		} ];
	},

	launch : function() {
		this._createMilestoneWaspiDataStore();
	},

	/**
	 * Create the WASPI Data Store for Milestone
	 */
	_createMilestoneWaspiDataStore : function() {
		Ext.getBody().mask('Loading...');
		console.log("Rally.environment.getContext().getProject()._ref : ", Rally.environment.getContext().getProject()._ref);

		//Create filter based on settings selection
		var filter;
		if (this.getSetting('IncludeNullTargetProjMilestone')) {
			var projFilter = Ext.create('Rally.data.wsapi.Filter', {
				property : 'TargetProject',
				operator : '=',
				value : Rally.environment.getContext().getProject()._ref
			});
			filter = projFilter.or(Ext.create('Rally.data.wsapi.Filter', {
				property : 'TargetProject',
				operator : '=',
				value : null
			}));
		} else {
			filter = Ext.create('Rally.data.wsapi.Filter', {
				property : 'TargetProject',
				operator : '=',
				value : Rally.environment.getContext().getProject()._ref
			});
		}

		milestoneWaspiDataStore = Ext.create('Rally.data.wsapi.Store', {
			model : 'Milestone',
			autoLoad : true,
			compact : false,
			context : {
				workspace : Rally.environment.getContext().getWorkspace()._ref,
				project : Rally.environment.getContext().getProject()._ref,
				projectScopeUp : false,
				projectScopeDown : true
			},
			filters : filter,
			fetch : [ 'FormattedID', 'Name', 'TargetDate', 'TargetProject' ],
			limit : Infinity,
			listeners : {
				load : function(store, data, success) {
					if (data.length > 0) {
						this._createMilestoneDataStore(data);
					} else {
						//Ext.Msg.alert('Warning', 'No Milestone is associated with the selected Project.');
						Rally.ui.notify.Notifier.showError({
							message : 'No Milestone is associated with the selected Project.'
						});
					}
					Ext.getBody().unmask();
				},
				scope : this
			},
			sorters : [ {
				property : 'Name',
				direction : 'ASC'
			} ]
		});
	},

	/**
	 * Convert the WASPI Data Store for Milestone to Ext.data.Store
	 */
	_createMilestoneDataStore : function(myData) {

		var milestoneArr = [];

		Ext.each(myData, function(data, index) {
			var milestone = {};
			milestone.FormattedID = data.data.FormattedID;
			milestone.Name = data.data.Name;
			milestone.TargetDate = data.data.TargetDate;
			milestone.TargetProject = data.data.TargetProject;
			milestoneArr.push(milestone);
		});

		this.milestoneDataStore = Ext.create('Ext.data.Store', {
			fields : [ 'FormattedID', 'Name', 'TargetDate', 'TargetProject' ],
			data : milestoneArr
		});
		this._createMilestonePicker();
	},

	/**
	 * Create the Ext.form.ComboBox for the Milestone
	 */
	_createMilestonePicker : function() {
		this.milestonePicker = Ext.create('Ext.form.ComboBox', {
			fieldLabel : 'Milestone ',
			store : this.milestoneDataStore,
			renderTo : Ext.getBody(),
			displayField : 'Name',
			queryMode : 'local',
			valueField : 'FormattedID',
			border : 1,
			style : {
				borderColor : '#000000',
				borderStyle : 'solid',
				borderWidth : '1px',
				height : '40px'
			},
			width : 400,
			padding : '10 5 5 10',
			margin : '10 5 5 10',
			shadow : 'frame',
			labelAlign : 'right',
			labelStyle : {
				margin : '10 5 5 10'
			},
			listeners : {
				select : function(combo, records, eOpts) {
					console.log(combo.getValue());
				}
			}
		});
		this.add(this.milestonePicker);
	}
});