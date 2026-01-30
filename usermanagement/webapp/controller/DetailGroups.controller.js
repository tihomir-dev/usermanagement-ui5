sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "com/customer/usermanagement/usermanagement/util/formatter",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
], (Controller, JSONModel, MessageToast, Formatter, MessageBox, Fragment, Filter, FilterOperator) => {
    "use strict";

    return Controller.extend("com.customer.usermanagement.usermanagement.controller.DetailGroups", {
        formatter: Formatter,

        onInit() {
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var oRouter = this.getOwnerComponent().getRouter();
            var groupsModel = new JSONModel({
                currentGroup: {},
                actionButtonsInfo: {
                    midColumn: {
                        fullScreen: true,
                        exitFullScreen: false,
                        closeColumn: true
                    }
                },
                isEditMode: false,
                groupsSelected: false
            });
            this.getView().setModel(groupsModel, "groupsModel");
            oRouter.getRoute("groupDetail").attachPatternMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: async function (oEvent) {
            try {
                const layout = oEvent.getParameter("arguments").layout;
                const groupId = oEvent.getParameter("arguments").groupId;

                console.log("Route matched. Layout:", layout, "groupId:", groupId);
                this._resetButtonStates();

                var layoutModel = this.getOwnerComponent().getModel("layout");
                if (layoutModel) {
                    layoutModel.setProperty("/layout", layout);
                    console.log("Layout applied:", layout);
                }
                await this._loadGroupById(groupId);
                await this._loadGroupMembers(groupId);


            } catch (error) {
                console.error("Error in route matched:", error);
                MessageToast.show("Error loading user details");
            }
        },
        _loadGroupById: async function (groupdId) {
            var oView = this.getView();
            var groupsModel = this.getView().getModel("groupsModel");
            oView.setBusy(true);

            try {
                var response = await fetch(`/api/groups/${groupdId}`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                var groupData = await response.json();

                groupsModel.setProperty("/currentGroup", groupData);
                groupsModel.setProperty("/editGroup", groupData);

                oView.setBusy(false);
            } catch (error) {
                console.error("Couldn't retrieve user data:", error);
                MessageToast.show("Error loading user details. Please try again.");
                oView.setBusy(false);
            }
        },
        _loadGroupMembers: async function (groupdId) {
            var oView = this.getView();
            var groupsModel = this.getView().getModel("groupsModel");
            oView.setBusy(true);

            try {
                var response = await fetch(`/api/groups/${groupdId}/members`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                var groupMembers = await response.json();
                groupsModel.setProperty("/currentGroup/members", groupMembers.members);

            } catch (error) {
                console.error("Error loading groups");
            } finally {
                oView.setBusy(false);
            }
        },
        handleClose: function () {
            var groupsModel = this.getView().getModel("groupsModel");
            groupsModel.setProperty("/isEditMode", false);
            var layoutModel = this.getOwnerComponent().getModel("layout");
            if (layoutModel) {
                layoutModel.setProperty("/layout", "OneColumn");
                this._updateButtonStates(false, false, false);
            }

            this.getOwnerComponent().getRouter().navTo("groups");
        },
        _updateButtonStates: function (fullScreen, exitFullScreen, closeColumn) {
            var groupsModel = this.getView().getModel("groupsModel");
            groupsModel.setProperty("/actionButtonsInfo/midColumn/fullScreen", fullScreen);
            groupsModel.setProperty("/actionButtonsInfo/midColumn/exitFullScreen", exitFullScreen);
            groupsModel.setProperty("/actionButtonsInfo/midColumn/closeColumn", closeColumn);
        },
        handleFullScreen: function () {
            var layoutModel = this.getOwnerComponent().getModel("layout");
            if (layoutModel) {
                layoutModel.setProperty("/layout", "MidColumnFullScreen");
                this._updateButtonStates(false, true, true);
            }
        },
        handleExitFullScreen: function () {
            var layoutModel = this.getOwnerComponent().getModel("layout");
            if (layoutModel) {
                layoutModel.setProperty("/layout", "TwoColumnsBeginExpanded");
                this._updateButtonStates(true, false, true);
            }
        },
        _resetButtonStates: function () {
            var groupsModel = this.getView().getModel("groupsModel");
            groupsModel.setProperty("/actionButtonsInfo/midColumn/fullScreen", true);
            groupsModel.setProperty("/actionButtonsInfo/midColumn/exitFullScreen", false);
            groupsModel.setProperty("/actionButtonsInfo/midColumn/closeColumn", true);
        },
        handleEdit: function () {
            var oView = this.getView();
            var groupsModel = this.getView().getModel("groupsModel");
            var currentGroup = groupsModel.getProperty("/currentGroup");

            if (!this._oEditGroupDialog) {
                this._oEditGroupDialog = sap.ui.xmlfragment(
                    oView.getId(),
                    "com.customer.usermanagement.usermanagement.view.fragments.EditGroupDialog",
                    this
                );
                oView.addDependent(this._oEditGroupDialog);
            }

            // Create a copy for editing
            var editGroup = JSON.parse(JSON.stringify(currentGroup));
            var editGroupModel = new sap.ui.model.json.JSONModel({
                name: editGroup.NAME,
                displayName: editGroup.DISPLAY_NAME,
                description: editGroup.DESCRIPTION,
                id: editGroup.ID
            });

            this.getView().setModel(editGroupModel, "editGroupModel");
            this._oEditGroupDialog.open();
        },
        onEditGroupSave: async function () {
            var editGroupModel = this.getView().getModel("editGroupModel");
            var editData = editGroupModel.getData();
            var groupsModel = this.getView().getModel("groupsModel");
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var oView = this.getView();

            if (!editData.displayName) {
                sap.m.MessageToast.show(oResourceBundle.getText("requiredFieldsError"));
                return;
            }

            oView.setBusy(true);

            var updateData = {
                name: editData.name,
                displayName: editData.displayName,
                description: editData.description
            };

            try {
                var response = await fetch(`/api/groups/${editData.id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify(updateData)
                });

                if (!response.ok) {
                    var errorData = await response.json();
                    throw errorData;
                }

                var updatedData = await response.json();
                groupsModel.setProperty("/currentGroup", updatedData);

                sap.m.MessageToast.show(oResourceBundle.getText("groupSavedSuccess"));
                this._oEditGroupDialog.close();
                this._reloadGroupsTable();
                oView.setBusy(false);

            } catch (error) {
                console.error("Error saving group:", error);
                sap.m.MessageToast.show(oResourceBundle.getText("groupSaveError"));
                oView.setBusy(false);
            }
        },
        onEditGroupCancel: function () {
            this._oEditGroupDialog.close();
            this._oEditGroupDialog.destroy();
            this._oEditGroupDialog = null;
        },
        _reloadGroupsTable: function () {
            sap.ui.getCore().getEventBus().publish("GroupChannel", "ReloadGroups");
        }







    });
});