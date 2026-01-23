sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "com/customer/usermanagement/usermanagement/service/UserService"
], (Controller, JSONModel, MessageToast, UserService) => {
    "use strict";

    return Controller.extend("com.customer.usermanagement.usermanagement.controller.DetailUsers", {
        onInit() {
            var oRouter = this.getOwnerComponent().getRouter();
            var userModel = new JSONModel({
                id: "", 
                firstName: "",
                loginName: "",
                email: "", 
                lastName: "", 
                userType: "",
                userStatus: "", 
                validFrom: "", 
                validTo: "", 
                country: "", 
                company: "", 
                city: "", 
                iasLastModified: "", 
                createdAt: "", 
                updatedAt: "",
                actionButtonsInfo: {
                    midColumn: {
                    fullScreen: true,
                    exitFullScreen: false,
                    closeColumn: true
                    }
                },
                isEditMode: false,
            });

            this.getView().setModel(userModel, "userModel");
            oRouter.getRoute("userDetail").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async  function (oEvent) {
            const layout = oEvent.getParameter("arguments").layout;
            var userId = oEvent.getParameter("arguments").userId;
           

            console.log("Route matched. Layout:", layout);

            this._resetButtonStates();


            const oFCL = this.getOwnerComponent()
            .getRootControl()
            .byId("fcl");

            if (oFCL) {
                oFCL.setLayout(layout);
                console.log(" Layout applied:", layout);
            } else {
                console.error(" FlexibleColumnLayout not found");
            }
            await this._loadUserById(userId);
        },

        _loadUserById: async function (userId){
            var oView = this.getView();
            var userModel = this.getView().getModel("userModel");
            oView.setBusy(true);

             try{
                var response = await fetch(`/api/users/${userId}`);
                if(!response.ok){
                    throw new Error(`HTTP ${response.status}`);
                
                }
                var userData = await response.json();
                userModel.setProperty("/id", userData.ID);
                userModel.setProperty("/firstName", userData.FIRST_NAME);
                userModel.setProperty("/loginName", userData.LOGIN_NAME);
                userModel.setProperty("/email", userData.EMAIL);
                userModel.setProperty("/lastName", userData.LAST_NAME);
                userModel.setProperty("/userType", userData.USER_TYPE);
                userModel.setProperty("/userStatus", userData.STATUS);
                userModel.setProperty("/validFrom", userData.VALID_FROM);
                userModel.setProperty("/validTo", userData.VALID_TO);
                userModel.setProperty("/country", userData.COUNTRY);
                userModel.setProperty("/company", userData.COMPANY);
                userModel.setProperty("/city", userData.CITY);
                userModel.setProperty("/iasLastModified", userData.IAS_LAST_MODIFIED);
                userModel.setProperty("/createdAt", userData.CREATED_AT);
                userModel.setProperty("/updatedAt", userData.UPDATED_AT);

                }catch (error){
                    console.error("Couldnt retrive data");
                }finally {
                    oView.setBusy(false);
                }
        },
        _resetButtonStates: function() {
            var userModel = this.getView().getModel("userModel");
            userModel.setProperty("/actionButtonsInfo/midColumn/fullScreen", true);
            userModel.setProperty("/actionButtonsInfo/midColumn/exitFullScreen", false);
            userModel.setProperty("/actionButtonsInfo/midColumn/closeColumn", true);
        },

        _updateButtonStates: function(fullScreen, exitFullScreen, closeColumn) {
            var userModel = this.getView().getModel("userModel");
            userModel.setProperty("/actionButtonsInfo/midColumn/fullScreen", fullScreen);
            userModel.setProperty("/actionButtonsInfo/midColumn/exitFullScreen", exitFullScreen);
            userModel.setProperty("/actionButtonsInfo/midColumn/closeColumn", closeColumn);
        },

        handleFullScreen: function() {
            const oFCL = this.getOwnerComponent()
            .getRootControl()
            .byId("fcl");

            if (oFCL) {
                oFCL.setLayout("MidColumnFullScreen");
                this._updateButtonStates(false, true, true);
            }
        },

        handleExitFullScreen: function() {
            const oFCL = this.getOwnerComponent()
            .getRootControl()
            .byId("fcl");

            if (oFCL) {
                oFCL.setLayout("TwoColumnsBeginExpanded");
                this._updateButtonStates(true, false, true);
            }
        },

        handleClose: function() {
            const oFCL = this.getOwnerComponent()
            .getRootControl()
            .byId("fcl");

            if (oFCL) {
                oFCL.setLayout("OneColumn");
                this._updateButtonStates(false, false, false);
            }
        },
        handleEdit: function(){
            var userModel = this.getView().getModel("userModel");
            userModel.setProperty("/isEditMode", true);
        }, 

         handleCancel: function() {
            var userModel = this.getView().getModel("userModel");
            userModel.setProperty("/isEditMode", false);
            
            // Reload data to discard changes
            var userId = userModel.getProperty("/id");
            if (userId) {
                this._loadUserById(userId);
            }
        },
        handleSave: function() {
            var userModel = this.getView().getModel("userModel");
            var userData = userModel.getData();
            
            // Validate required fields
            if (!userData.firstName || !userData.lastName || !userData.email) {
                MessageToast.show("Please fill in all required fields");
                return;
            }
            
            this.getView().setBusy(true);
            
            // Prepare data for API (camelCase format for PATCH)
            var updateData = {
                firstName: userData.firstName,
                lastName: userData.lastName,
                loginName: userData.loginName,
                email: userData.email,
                userType: userData.userType,
                userStatus: userData.userStatus,
                validFrom: userData.validFrom,
                validTo: userData.validTo,
                country: userData.country,
                company: userData.company,
                city: userData.city,
                telephone: userData.telephone,
                mobilePhone: userData.mobilePhone,
                fax: userData.fax,
                language: userData.language,
                timeZone: userData.timeZone,
                displayName: userData.displayName
            };
            
            fetch(`/api/users/${userData.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " // Add your token if needed
                },
                body: JSON.stringify(updateData)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(() => {
                MessageToast.show("User details saved successfully");
                userModel.setProperty("/isEditMode", false);
                this.getView().setBusy(false);
            })
            .catch(error => {
                console.error("Couldn't save user data:", error);
                MessageToast.show("Failed to save user details. Please try again.");
                this.getView().setBusy(false);
            });
        },
        

        
        






    });
});