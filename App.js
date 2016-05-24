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

		// Create filter based on settings selection
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
			fetch : [ 'ObjectID', 'FormattedID', 'Name', 'TargetDate', 'TargetProject' , 'c_ActiveStartDate'],
			limit : Infinity,
			listeners : {
				load : function(store, data, success) {
					if (data.length > 0) {
						this._createMilestoneDataStore(data);
					} else {
						// Ext.Msg.alert('Warning', 'No Milestone is associated
						// with the selected Project.');
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
			milestone.ObjectID = data.data.ObjectID;
			milestone.FormattedID = data.data.FormattedID;
			milestone.Name = data.data.Name;
			milestone.TargetDate = data.data.TargetDate;
			milestone.TargetProject = data.data.TargetProject;
			milestone.ActiveStartDate= data.data.c_ActiveStartDate;
			milestoneArr.push(milestone);
		});

		this.milestoneDataStore = Ext.create('Ext.data.Store', {
			fields : [ 'ObjectID', 'FormattedID', 'Name', 'TargetDate', 'TargetProject', 'ActiveStartDate' ],
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
			valueField : 'ObjectID',
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
					//console.log("Selected Milestone : ", combo.getValue());
					//console.log("Selected records : ", records);
					//console.log("Selected eOpts : ", eOpts);
					this.selectedMilestone = combo.getValue();
					this.selectedMilestoneObj = records;
					this._drawBurnUpChart();
				},
				scope : this
			}
		});
		this.add(this.milestonePicker);
	},

	/**
	 * Create the burnup chart and draw it
	 */
	_drawBurnUpChart : function() {
		Ext.getBody().mask('Generating Burnup Chart...');

		Deft.Promise.all([ this._loadPIsInMilestone(), this._loadScheduleStateValues() ]).then({
			success : function() {
				this._addChart();
			},
			scope : this
		});
	},

	_loadScheduleStateValues : function() {
		return Rally.data.ModelFactory.getModel({
			type : 'UserStory',
			success : function(model) {
				model.getField('ScheduleState').getAllowedValueStore().load({
					callback : function(records) {
						this.scheduleStateValues = _.invoke(records, 'get', 'StringValue');
					},
					scope : this
				});
			},
			scope : this
		});
	},

	_loadPIsInMilestone : function() {
		var that = this;
		return Ext.create('Rally.data.wsapi.artifact.Store', {
			models : [ 'portfolioitem/feature', 'defect', 'userstory' ],
			context : {
				workspace : that.getContext().getWorkspace()._Ref,
				project : null,
				limit : Infinity,
				projectScopeUp : false,
				projectScopeDown : true
			},
			filters : [ {
				property : 'Milestones.ObjectID',
				operator : '=',
				value : that.selectedMilestone
			} ]
		}).load().then({
			success : function(artifacts) {
				this.piRecords = artifacts;
			},
			scope : this
		});
	},

	_addChart : function() {
		var that = this;

		if (that.down('rallychart')) {
			that.down('rallychart').destroy();
		}

		//console.log("_.invoke(that.selectedMilestoneObj, 'get', 'ActiveStartDate')", _.compact(_.invoke(that.selectedMilestoneObj, 'get', 'ActiveStartDate')));
		//console.log("_.invoke(that.selectedMilestoneObj, 'get', 'ActiveStartDate')", (_.isEmpty(_.compact(_.invoke(that.selectedMilestoneObj, 'get', 'ActiveStartDate')))));
		//console.log("that.piRecords",that.piRecords);
		
		var chartStartDate = _.isEmpty(_.compact(_.invoke(that.selectedMilestoneObj, 'get', 'ActiveStartDate'))) ? _.min(_.compact(_.invoke(that.piRecords, 'get', 'ActualStartDate'))) : _.first(_.compact(_.invoke(that.selectedMilestoneObj, 'get', 'ActiveStartDate'))); 
		var chartEndDate = _.first(_.compact(_.invoke(that.selectedMilestoneObj, 'get', 'TargetDate')));
		
		this.add({
			xtype : 'rallychart',
			flex : 1,
			storeType : 'Rally.data.lookback.SnapshotStore',
			storeConfig : that._getStoreConfig(),
			calculatorType : 'Rally.example.BurnCalculator',
			calculatorConfig : {
				completedScheduleStateNames : [ 'Accepted', 'Released' ],
				stateFieldValues : that.scheduleStateValues,
				startDate : chartStartDate,
				endDate : chartEndDate,
				enableProjects : true
			},
			chartColors: ["#A16E3A", "#1B7F25", "#B1B1B7", "#2E2EAC"],
			chartConfig : that._getChartConfig(),
			listeners : {
				afterrender : function(obj, eOpts ) {					
					Ext.getBody().unmask();
				},
				scope : this
			}
		});
		//Ext.getBody().unmask();
	},
	
	/*_updateRallyDateDuration : function(obj){
		console.log("obj",obj);
	},*/

	/**
	 * Generate the store config to retrieve all snapshots for all leaf child
	 * stories of the specified PI
	 */
	_getStoreConfig : function() {
		return {
			find : {
				_TypeHierarchy : {
					'$in' : [ 'HierarchicalRequirement' ]
				},
				_ItemHierarchy : {
					'$in' : _.invoke(this.piRecords, 'getId')
				}
			},
			fetch : [ 'ScheduleState', 'PlanEstimate' ],
			hydrate : [ 'ScheduleState' ],
			sort : {
				_ValidFrom : 1
			},
			context : this.getContext().getDataContext(),
			limit : Infinity
		};
	},

	/**
	 * Generate a valid Highcharts configuration object to specify the chart
	 */

	_getChartConfig : function() {
		return {
			chart : {
				defaultSeriesType : 'area',
				zoomType : 'xy'
			},
			title : {
				text : 'Milestone Burnup'
			},
			xAxis : {
				categories : [],
				tickmarkPlacement : 'on',
				tickInterval : 5,
				title : {
					text : 'Date',
					margin : 10
				}
			},
			yAxis : [ {
				title : {
					text : 'Counts'
				}
			} ],
			tooltip : {
				formatter : function() {
					return '' + this.x + '<br />' + this.series.name + ': ' + Math.ceil(this.y);
				}
			},
			plotOptions : {
				series : {
					marker : {
						enabled : false,
						states : {
							hover : {
								enabled : true
							}
						}
					},
					groupPadding : 0.01
				},
				column : {
					stacking : null,
					shadow : false
				}
			}
		};
	}

});
