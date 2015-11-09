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
			fetch : [ 'ObjectID', 'FormattedID', 'Name', 'TargetDate', 'TargetProject' ],
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
			milestoneArr.push(milestone);
		});

		this.milestoneDataStore = Ext.create('Ext.data.Store', {
			fields : [ 'ObjectID', 'FormattedID', 'Name', 'TargetDate', 'TargetProject' ],
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
					console.log("Selected Milestone : ", combo.getValue());
					this.selectedMilestone = combo.getValue();
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
		console.log("_drawBurnUpChart started for this.selectedMilestone:", this.selectedMilestone);

		Deft.Promise.all([ this._loadPIsInMilestone(), this._loadScheduleStateValues() ]).then({
			success : function() {
				this._addChart();
			},
			scope : this
		});
		//this._loadPIsInMilestone();
		/*Deft.Promise.all([ this._loadPIsInMilestone()]).then({
			success : function() {
				console.log("_drawBurnUpChart success: ");
				this._addChart();
			},
			scope : this
		});*/

		/*
		 * Ext.create('Rally.data.lookback.SnapshotStore', { findConfig : {
		 * "_ItemHierarchy" : 21619727142,//selected milestone value 40132266915
		 * "_TypeHierarchy" : "HierarchicalRequirement", "Children" : null },
		 * fetch : [ 'ScheduleState', 'PlanEstimate' ], hydrate : [
		 * 'ScheduleState' ], limit : Infinity, autoLoad : true, listeners : {
		 * load : function(store, data, success) { console.log("Data --------- > ",
		 * data); } } });
		 */
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
		console.log("_loadPIsInMilestone started for this.selectedMilestone:", this.selectedMilestone);
		Ext.create('Rally.data.wsapi.Store', {
			model : 'TypeDefinition',
			autoLoad : true,
			fetch : [ 'TypePath' ],
			filters : [ {
				property : 'Parent.Name',
				value : 'Portfolio Item'
			}, {
				property : 'Ordinal',
				value : 0
			} ],
			listeners : {
				load : function(store, records, success) {
					console.log("_loadPIsInMilestone records : ", records);
					this.piType = records[0].get('TypePath');
					console.log("_loadPIsInMilestone this.piType : ", this.piType);
					console.log("_loadPIsInMilestone this.selectedMilestone : ", this.selectedMilestone);
					Ext.create('Rally.data.wsapi.Store', {
						model : that.piType,
						autoLoad : true,
						fetch : [ 'ObjectID', 'Project', 'Name', 'PreliminaryEstimate', 'ActualStartDate', 'PlannedEndDate', 'AcceptedLeafStoryPlanEstimateTotal', 'LeafStoryPlanEstimateTotal' ],
						filters : [ {
							property : 'Milestones.ObjectID',
							operator : '=',
							value : this.selectedMilestone
						} ],
						context : {
							project : null
						},
						limit : Infinity,
						listeners : {
							load : function(store, piRecords, success) {
								console.log("_loadPIsInMilestone success:", piRecords);
								that.piRecords = piRecords;
								that._addChart();
							}
						},
						scope : this
					});
				},
				scope : this
			}
		});
	},

	_addChart : function() {
		var that = this;

		if (this.down('rallychart')) {
			this.down('rallychart').destroy();
		}

		this.add({
			xtype : 'rallychart',
			flex : 1,
			storeType : 'Rally.data.lookback.SnapshotStore',
			storeConfig : that._getStoreConfig(),
			calculatorType : 'Rally.example.BurnCalculator',
			calculatorConfig : {
				completedScheduleStateNames : [ 'Accepted', 'Released' ],
				stateFieldValues : that.scheduleStateValues,
				startDate : _.min(_.compact(_.invoke(that.piRecords, 'get', 'ActualStartDate'))),
				enableProjects : true
			},
			chartConfig : that._getChartConfig()
		});
	},

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
					return '' + this.x + '<br />' + this.series.name + ': ' + this.y;
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