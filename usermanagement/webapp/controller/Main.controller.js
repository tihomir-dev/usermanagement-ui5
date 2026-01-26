sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "com/customer/usermanagement/usermanagement/service/UserService",
    "sap/ui/core/Fragment"
], (Controller, JSONModel, MessageToast, UserService, Fragment) => {
    "use strict";

    return Controller.extend("com.customer.usermanagement.usermanagement.controller.Main", {
        onInit() {
            
            var that = this;
            this.oRouter = that.getOwnerComponent().getRouter();
            const userModel = new JSONModel({
                name: "",
                email: "",
                firstName: "",
                lastName: "", 
                displayName: "",
                initials: ""
            });


            this.getView().setModel(userModel, "userModel");
            this.loadCurrentUser();
            this.loadUserStats();
            this.loadGroupsStats();

            /* var userCard = this.getView().byId("userCard");
            if (userCard) {
                userCard.setModel(usersCardData, "usersCardData");
            } */
        }, 

        loadCurrentUser: async function(){
            try{

                const userData = await UserService.getCurrentUser();
                const uModel = this.getView().getModel("userModel");
                uModel.setData(userData);
            }catch (error){
                console.log("Error");
            }
        },

        loadUserStats: async function(){
            try{
                var totalResponse = await fetch('/api/users?startIndex=1&count=1');
                var totalData = await totalResponse.json();
                var total = totalData.total;

                var activeResponse = await fetch('/api/users?status=ACTIVE&startIndex=1&count=1');
                var activeData = await activeResponse.json();
                var activeCount = activeData.total; 

                var inactiveResponse = await fetch('/api/users?status=INACTIVE&startIndex=1&count=1');
                var inactiveData = await inactiveResponse.json();
                var inactiveCount = inactiveData.total;

                var oCard = this.getView().byId("userCard");
                if (oCard) {
                    var oCardModel = oCard.getModel();  
                    if (oCardModel) {
                        oCardModel.setData({
                        total: total,
                        activeCount: activeCount,
                        inactiveCount: inactiveCount
                        });
                    }
                }
            }catch (error){
                console.error("Failed to load users stats.");
            }
        },
        loadGroupsStats: async function() {
    try {
        const totalResponse = await fetch('/api/groups?startIndex=1&count=1');

        if (!totalResponse.ok) {
            throw new Error(`Failed to fetch groups. Status: ${totalResponse.status}`);
        }

        const totalData = await totalResponse.json();
        const totalGroups = totalData.totalResults;

        const oCard = this.getView().byId("groupCard");
        if (oCard) {
            const oCardModel = oCard.getModel();
            if (oCardModel) {
                oCardModel.setData({
                    totalGroups: totalGroups
                });
            }
        }

    } catch (error) {
        console.error("Failed to load group data:", error);
    }
    },
    onLogout: function() {
   
        window.location.href = "/do/logout";
    },


        
        onCardAction: function(oEvent) {
            const oParameters = oEvent.getParameter("parameters");
            const sAction = oParameters.action;

            if (sAction === "navigateToUsers") {
                 this.oRouter.navTo("RouteUsers");
            }

            if (sAction === "navigateToGroups") {
                this.oRouter.navTo("RouteGroups");
            }
        },
        onPressAvatar: function(oEvent){
            var oButton = oEvent.getSource();
            var oView = this.getView();

            if (!this._pUserMenuPopover) {
                this._pUserMenuPopover = Fragment.load({
                id: oView.getId(), 
                name: "com.customer.usermanagement.usermanagement.view.fragments.UserPopOver", 
                controller: this
                }).then(function (oPopover) {

                oView.addDependent(oPopover); 
                return oPopover;
                });
            }
            this._pUserMenuPopover.then(function(oPopover) {
        oPopover.openBy(oButton);
    });
        },
        toUsers: function(oEvent){
            this.oRouter.navTo("RouteUsers");
        },
        toGroups: function(oEvent){
            this.oRouter.navTo("RouteGroups");
        }



        
    });
});