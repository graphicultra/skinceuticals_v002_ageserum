# Before you start:

You need to create a CameraKit app and connect your Lens to it. You can find detailed instructions on how to do it here:

```
https://developers.snap.com/camera-kit/home
```

Once you have your CameraKit app ready and your Lens connected to it (through a Lens Group), you can move on with the webAR app:


# Update the code with your lens IDs:

1. Go to file `src/main.js` and change the lines:

```
const apiToken = "YOUR_API_TOKEN";
```

Update YOUR_API_TOKEN with your Lens Studio CameraKit API Token

```
const lens = await cameraKit.lensRepository.loadLens('your lens ID','your lens folder ID');
```

Update the lens ID and the lens folder ID with the new lens ID and the new lens folder ID.



# To build the project:

This project uses npm and webpack, so you need npm installed on your computer in order to run and build the project.

Go to the main folder and run the following command to install all the dependencies for the project:

```
npm i
```


To run the project locally:

```
npm start
```

To build the project for publishing:

```
npm run build
```

It will build the project in the folder `app`. Simply upload the files in the `app` folder to your web server.




# Important:

1) Iour webserver should have a SSL certificate (https) in order to run the webApp

2) Your Lens version should be compatible with the installed CameraKit version. You can change it on package.json:

```
@snap/camera-kit": "^1.1.0",
```

You can find the minumum Lens version on your Lens Studio dashboard, lens-scheduler/groups, in the Min Web SDK Version column.

3) Before you publish the production version of your Lens, you have to send it to Snapchat for approval. Once it's approved, you can use the Production API ID instead of the Development or Staging API IDs.