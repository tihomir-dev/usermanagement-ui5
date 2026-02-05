sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "com/customer/usermanagement/usermanagement/service/UserService",
    "sap/ui/core/BusyIndicator",
], (Controller, JSONModel, MessageToast, UserService, BusyIndicator) => {
    "use strict";

    return Controller.extend("com.customer.usermanagement.usermanagement.controller.Groups", {
        onInit() {
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            this.oRouter = this.getOwnerComponent().getRouter();
            var groupsModel = new JSONModel({
                groups: [],
                total: 0
            });
            this.getView().setModel(groupsModel, "groupsModel");
            this.loadAllGroups();
            sap.ui.getCore().getEventBus().subscribe("GroupChannel", "ReloadGroups", function (channel, event, data) {
                this.loadAllGroups("");
            }.bind(this));
        },
        loadAllGroups: async function (queryString) {
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            queryString = queryString || "";
            try {
                var groupsModel = this.getView().getModel("groupsModel");
                sap.ui.core.BusyIndicator.show(0);
                var response = await fetch(`/api/groups${queryString}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const dbResponse = await response.json();
                groupsModel.setProperty("/groups", dbResponse.Resources);
                groupsModel.setProperty("/total", dbResponse.totalResults);
                var oTable = this.getView().byId("groupsTable");
                if (oTable) {
                    oTable.removeSelections(true);
                }
                setTimeout(() => {
                    sap.ui.core.BusyIndicator.hide();
                }, 500);

            } catch (error) {
                cconsole.error(oResourceBundle.getText("couldntRetrieveGroups"), error);
                MessageBox.error(oResourceBundle.getText("errorLoadingGroups"), {
                    title: oResourceBundle.getText("errorTitle"),
                    onClose: function (sAction) {
                        sap.ui.core.BusyIndicator.hide();
                    }
                });
            }
        },
        onListItemPress: async function (oEvent) {
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            try {
                const oSelectedItem = oEvent.getParameter("listItem");
                const oCtx = oSelectedItem.getBindingContext("groupsModel");
                const groupId = oCtx.getProperty("ID");
                this.oRouter.navTo("groupDetail", {
                    groupId: groupId,
                    layout: "TwoColumnsBeginExpanded"
                });
            } catch (error) {
                MessageToast.show(oResourceBundle.getText("errorOpeningGroupDetails"));
            }
        },
        onSearchLiveChange: function (oEvent) {
            if (this._searchTimeout) {
                clearTimeout(this._searchTimeout);
            }
            this._searchTimeout = setTimeout(() => {
                this.searchGroups();
            }, 300);
        },
        searchGroups: function () {
            var searchField = this.getView().byId("groupSearchField");
            var search = searchField.getValue();
            var queryParams = [];
            queryParams.push("startIndex=1");
            queryParams.push("count=100");
            if (search) queryParams.push("search=" + encodeURIComponent(search));
            var queryString = queryParams.length > 0 ? "?" + queryParams.join("&") : "";
            this.loadAllGroups(queryString);
        },
        onCreate: function () {
            var oView = this.getView();
            var groupsModel = this.getView().getModel("groupsModel");

            if (!this._oCreateGroupDialog) {
                this._oCreateGroupDialog = sap.ui.xmlfragment(
                    oView.getId(),
                    "com.customer.usermanagement.usermanagement.view.fragments.CreateGroupDialog",
                    this
                );
                oView.addDependent(this._oCreateGroupDialog);
            }
            var createGroupModel = new sap.ui.model.json.JSONModel({
                name: "",
                displayName: "",
                description: ""
            });
            this._oCreateGroupDialog.setModel(createGroupModel, "createGroupModel");
            this._oCreateGroupDialog.open();
        },
        onCreateGroupSave: async function () {
            var oView = this.getView();
            var createGroupModel = this._oCreateGroupDialog.getModel("createGroupModel");
            var groupData = createGroupModel.getData();
            var groupsModel = this.getView().getModel("groupsModel");
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            if (!groupData.name || !groupData.displayName) {
                sap.m.MessageToast.show(oResourceBundle.getText("requiredFieldsError"));
                return;
            }
            try {
                var response = await fetch('/api/groups', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        name: groupData.name,
                        displayName: groupData.displayName,
                        description: groupData.description
                    })
                });

                if (!response.ok) {
                    var errorData = await response.json();
                    throw errorData;
                }
                var result = await response.json();
                sap.m.MessageToast.show(oResourceBundle.getText("groupCreatedSuccess"));
                this.loadAllGroups("");
                this._oCreateGroupDialog.close();
            } catch (error) {
                sap.m.MessageToast.show(oResourceBundle.getText("groupCreateError"));
                oView.setBusy(false);
            }
        },
        onCreateGroupCancel: function () {
            this._oCreateGroupDialog.close();
            this._oCreateGroupDialog.destroy();
            this._oCreateGroupDialog = null;
        },
        showBusyIndicator: function (iDuration, iDelay) {
            BusyIndicator.show(iDelay || 0);
            if (iDuration && iDuration > 0) {
                if (this._sBusyTimeoutId) {
                    clearTimeout(this._sBusyTimeoutId);
                    this._sBusyTimeoutId = null;
                }
                this._sBusyTimeoutId = setTimeout(function () {
                    this.hideBusyIndicator();
                }.bind(this), iDuration);
            }
        },
        hideBusyIndicator: function () {
            BusyIndicator.hide();
        },
    });
});