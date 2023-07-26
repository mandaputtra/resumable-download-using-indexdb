# Example Resumable Download on the browser using IndexedDB

How to run :

```bash
$ npm install
$ npm run dev
```

## To test

1. Use any file URL, preferable the signed url from s3 cause they got range headers we can send and use
2. Refresh browser in the middle of upload 
3. Start download again with same url and same filename
4. Wait till finish
