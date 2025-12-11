module Api exposing
    ( Project
    , User
    , Translation
    , TranslationFile
    , fetchProjects
    , fetchUser
    , fetchTranslationFile
    , submitTranslation
    , projectDecoder
    , userDecoder
    , translationFileDecoder
    )

import Http
import Json.Decode as Decode exposing (Decoder, field, list, string, nullable)
import Json.Encode as Encode


-- TYPES


type alias User =
    { id : String
    , username : String
    , avatarUrl : String
    , email : Maybe String
    }


type alias Project =
    { id : String
    , name : String
    , owner : String
    , repository : String
    , sourceLanguage : String
    , targetLanguages : List String
    , description : Maybe String
    }


type alias Translation =
    { key : String
    , sourceValue : String
    , targetValue : Maybe String
    , status : String
    }


type alias TranslationFile =
    { filename : String
    , language : String
    , translations : List Translation
    , sourceLanguage : String
    }


-- HTTP REQUESTS


fetchUser : (Result Http.Error User -> msg) -> Cmd msg
fetchUser toMsg =
    Http.get
        { url = "/api/auth/me"
        , expect = Http.expectJson toMsg userDecoder
        }


fetchProjects : (Result Http.Error (List Project) -> msg) -> Cmd msg
fetchProjects toMsg =
    Http.get
        { url = "/api/projects"
        , expect = Http.expectJson toMsg (list projectDecoder)
        }


fetchTranslationFile : String -> String -> String -> (Result Http.Error TranslationFile -> msg) -> Cmd msg
fetchTranslationFile projectName language filename toMsg =
    Http.get
        { url = "/api/projects/" ++ projectName ++ "/translations/file/" ++ language ++ "/" ++ filename
        , expect = Http.expectJson toMsg translationFileDecoder
        }


submitTranslation : String -> String -> String -> String -> (Result Http.Error () -> msg) -> Cmd msg
submitTranslation projectName language key value toMsg =
    Http.post
        { url = "/api/projects/" ++ projectName ++ "/translations"
        , body =
            Http.jsonBody <|
                Encode.object
                    [ ( "language", Encode.string language )
                    , ( "key", Encode.string key )
                    , ( "value", Encode.string value )
                    ]
        , expect = Http.expectWhatever toMsg
        }


-- DECODERS


userDecoder : Decoder User
userDecoder =
    Decode.map4 User
        (field "id" string)
        (field "username" string)
        (field "avatarUrl" string)
        (field "email" (nullable string))


projectDecoder : Decoder Project
projectDecoder =
    Decode.map7 Project
        (field "id" string)
        (field "name" string)
        (field "owner" string)
        (field "repository" string)
        (field "sourceLanguage" string)
        (field "targetLanguages" (list string))
        (field "description" (nullable string))


translationDecoder : Decoder Translation
translationDecoder =
    Decode.map4 Translation
        (field "key" string)
        (field "sourceValue" string)
        (field "targetValue" (nullable string))
        (field "status" string)


translationFileDecoder : Decoder TranslationFile
translationFileDecoder =
    Decode.map4 TranslationFile
        (field "filename" string)
        (field "language" string)
        (field "translations" (list translationDecoder))
        (field "sourceLanguage" string)
