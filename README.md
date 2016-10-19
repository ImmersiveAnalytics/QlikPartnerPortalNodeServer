# Qlik Partner Portal Node.js Server
Node.js Express middleware app to pass information between Unity &amp; Qlik Sense

This web app will stream data from a Qlik Sense app into Unity. It will also pass selections back from Unity into Sense and then pass the returned data to Unity.

## Requirements
- *Used in conjunction with  [Qlik Partner Portal VR](https://github.com/ImmersiveAnalytics/QlikPartnerPortalVR)*
- Must have Qlik Sense Desktop or Server installed and running
- Must place Partner Portal VR Demo.qvf into Qlik Sense app folder
- Must have Node.js installed
- Must use a barcode scanner to identify users' company (for manual input, you can type ^^^^XXX with XXX the name of a company)

## To Run
Simply type `node unityNodeConnector.js` in a command prompt or terminal window
