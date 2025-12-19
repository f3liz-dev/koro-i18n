module Api exposing (..)

import Http
import Json.Decode as Decode
import Json.Encode as Encode

-- BASE URL

baseUrl : String
baseUrl = "/api"

-- TYPES

type alias Project =
    { name : String
    , description : String
    }

type alias User =
    { id : String
    , username : String
    , githubId : Int
    }

type alias Translation =
    { key : String
    , sourceValue : String
    , currentValue : String
    , isValid : Bool
    }

-- DECODERS

projectDecoder : Decode.Decoder Project
projectDecoder =
    Decode.map2 Project
        (Decode.field "name" Decode.string)
        (Decode.map (Maybe.withDefault "") (Decode.maybe (Decode.field "description" Decode.string)))

userDecoder : Decode.Decoder User
userDecoder =
    Decode.map3 User
        (Decode.field "id" Decode.string)
        (Decode.field "username" Decode.string)
        (Decode.field "githubId" Decode.int)

userResponseDecoder : Decode.Decoder User
userResponseDecoder =
    Decode.field "user" userDecoder

translationDecoder : Decode.Decoder Translation
translationDecoder =
    Decode.map4 Translation
        (Decode.field "key" Decode.string)
        (Decode.field "sourceValue" Decode.string)
        (Decode.field "currentValue" Decode.string)
        (Decode.field "isValid" Decode.bool)

-- REQUESTS

getProjects : (Result Http.Error (List Project) -> msg) -> Cmd msg
getProjects msg =
    Http.get
        { url = baseUrl ++ "/projects"
        , expect = Http.expectJson msg (Decode.field "projects" (Decode.list projectDecoder))
        }

createProject : { name : String, description : String } -> (Result Http.Error Project -> msg) -> Cmd msg
createProject project msg =
    let
        body =
            Encode.object
                [ ( "name", Encode.string project.name )
                , ( "description", Encode.string project.description )
                ]
    in
    Http.post
        { url = baseUrl ++ "/projects"
        , body = Http.jsonBody body
        , expect = Http.expectJson msg projectDecoder
        }

getUser : (Result Http.Error User -> msg) -> Cmd msg
getUser msg =
    Http.get
        { url = baseUrl ++ "/auth/me"
        , expect = Http.expectJson msg userResponseDecoder
        }

logout : (Result Http.Error () -> msg) -> Cmd msg
logout msg =
    Http.post
        { url = baseUrl ++ "/auth/logout"
        , body = Http.emptyBody
        , expect = Http.expectWhatever msg
        }

getTranslations : String -> String -> String -> (Result Http.Error (List Translation) -> msg) -> Cmd msg
getTranslations projectName language filename msg =
    let
        url = baseUrl ++ "/projects/" ++ projectName ++ "/translations?language=" ++ language ++ "&filename=" ++ filename
    in
    Http.get
        { url = url
        , expect = Http.expectJson msg (Decode.list translationDecoder)
        }

saveTranslation : String -> String -> String -> String -> String -> (Result Http.Error () -> msg) -> Cmd msg
saveTranslation projectName language filename key value msg =
    let
        body =
            Encode.object
                [ ( "language", Encode.string language )
                , ( "filename", Encode.string filename )
                , ( "key", Encode.string key )
                , ( "value", Encode.string value )
                ]
    in
    Http.post
        { url = baseUrl ++ "/projects/" ++ projectName ++ "/translations"
        , body = Http.jsonBody body
        , expect = Http.expectWhatever msg
        }
