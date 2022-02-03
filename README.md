# url-shortener

url-shortener is a serverless application meant to provide short URLs that redirect to other URLs.

_Example hosted at: https://ho72ako0b3.execute-api.us-east-1.amazonaws.com/dev_

## Endpoints

### GET /:shortUrlId

Retrieves an earlier made shortUrl and redirects the user to the stored originalUrl for that entry.

### GET /stats/:shortUrlId

Retrieves statistics surrounding the usage of given shortUrl

### POST /

POST Body:

```
{
    "originalUrl": <ORIGINAL URL TO REDIRECT>,
    "quota": <MAXIMUM QUOTA FOR THIS SHORTURL> (Optional)
}
```

Creates a new shortUrl for the given originalUrl. Returns the full shortUrl.

### POST /alias

POST Body:

```
{
    "originalShortId": <SHORT ID WHERE THE ALIAS IS CREATED FROM>
    "aliasShortId": <ALIAS ID>
}
```

Creates an alias shortUrl with a user provided ID that will point to the same originalId as the shortUrl the alias is derived from.

### PUT /:shortUrlId

POST Body:

```
{
    "id": <NEW ID>
}
```

Updates an old shortUrl to a new, user inputted shortUrl.

### DELETE /:shortUrlId

Deletes an existing shortUrl.
