Ext.define('CustomApp', {
	extend : 'Rally.app.App',
	componentCls : 'app',
	launch : function() {
		this._createMilestoneWaspiDataStore();
	},

	_createMilestoneWaspiDataStore : function() {
		milestoneWaspiDataStore = Ext.create('Rally.data.wsapi.Store', {
			model : 'Milestone',
			autoLoad : true,
			compact: false,
			context: {
				project : Rally.environment.getContext().getProject()
            },
			fetch : [ 'Name', 'TargetDate', 'TargetProject' ],
			listeners : {
				load : function(store, data, success) {
					console.log("Data : " , data);
					this._createMilestoneDataStore(data);
				},
				scope : this
			}
		});
	},

	_createMilestoneDataStore : function(myData) {

		var milestoneArr = [];

		Ext.each(myData, function(data, index) {
			var milestone = {};
			milestone.Name = data.data.Name;
			milestone.TargetDate = data.data.TargetDate;
			milestone.TargetProject = data.data.TargetProject;
			milestoneArr.push(milestone);
		});

		console.log("milestoneArr : " , milestoneArr);
		
		this.milestoneDataStore = Ext.create('Ext.data.Store', {
			fields : [ 'Name', 'TargetDate', 'TargetProject' ],
			data : milestoneArr
		});
		this._createMilestonePicker();
	},

	_createMilestonePicker : function() {
		this.milestonePicker = Ext.create('Ext.form.ComboBox', {
			fieldLabel : 'Milestone : ',
			store : this.milestoneDataStore,
			renderTo : Ext.getBody(),
			displayField : 'Name',
			queryMode : 'local',
			valueField : 'Name'
		});
		this.add(this.milestonePicker);
	}

});