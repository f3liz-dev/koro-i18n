module Pages.Translation.Editor exposing (Model, Msg(..), init, update, view)

import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (onClick, onInput)
import Http
import Api
import Components.Toast as Toast

type alias Model =
    { projectName : String
    , language : String
    , filename : String
    , translations : List Translation
    , counts : List TranslationCount
    , loading : Bool
    , error : Maybe String
    , filter : String
    , saving : Maybe String -- Key of translation currently being saved
    }

type alias Translation =
    { key : String
    , sourceValue : String
    , currentValue : String
    , isValid : Bool
    }

type alias TranslationCount =
    { language : String
    , filename : String
    , count : Int
    }

type Msg
    = GotTranslations (Result Http.Error (List Translation))
    | GotCounts (Result Http.Error (List TranslationCount))
    | FilterChanged String
    | UpdateTranslation String String
    | SaveTranslation String String
    | TranslationSaved (Result Http.Error ())

init : String -> String -> String -> ( Model, Cmd Msg )
init projectName language filename =
        ( { projectName = projectName
            , language = language
            , filename = filename
            , translations = []
            , counts = []
            , loading = True
            , error = Nothing
            , filter = ""
            , saving = Nothing
            }
        , if String.isEmpty filename then
                Api.getTranslationCounts projectName language GotCounts
            else
                Api.getTranslations projectName language filename GotTranslations
        )

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        GotTranslations result ->
            case result of
                Ok translations ->
                    ( { model | translations = translations, loading = False }, Cmd.none )

                Err _ ->
                    ( { model | loading = False, error = Just "Failed to load translations" }, Cmd.none )

        GotCounts result ->
            case result of
                Ok counts ->
                    ( { model | counts = counts, loading = False }, Cmd.none )

                Err _ ->
                    ( { model | loading = False, error = Just "Failed to load translation counts" }, Cmd.none )

        FilterChanged filter ->
            ( { model | filter = filter }, Cmd.none )

        UpdateTranslation key value ->
            let
                updateTrans t =
                    if t.key == key then
                        { t | currentValue = value }
                    else
                        t
            in
            ( { model | translations = List.map updateTrans model.translations }, Cmd.none )

        SaveTranslation key value ->
            ( { model | saving = Just key }
            , Api.saveTranslation model.projectName model.language model.filename key value TranslationSaved
            )

        TranslationSaved result ->
            case result of
                Ok _ ->
                     ( { model | saving = Nothing }, Cmd.none )

                Err _ ->
                     -- Handle save error (maybe show a toast or error message)
                     ( { model | saving = Nothing, error = Just "Failed to save translation" }, Cmd.none )

view : Model -> Html Msg
view model =
    div [ class "container main" ]
        [ div [ class "flex justify-between items-center mb-6" ]
            [ div []
                [ if String.isEmpty model.filename then
                    h1 [ class "text-2xl font-bold" ] [ text "Languages" ]
                  else
                    h1 [ class "text-2xl font-bold" ] [ text ("Translating " ++ model.filename) ]
                , p [ class "text-sm text-secondary" ] [ text (model.projectName ++ " • " ++ model.language) ]
                ]
            , div [ class "flex gap-2" ]
                [ a [ href ("/projects/" ++ model.projectName), class "btn ghost" ] [ text "Back to Project" ]
                ]
            ]

        , div [ class "mb-6" ]
            [ input
                [ type_ "text"
                , class "input"
                , placeholder "Search keys or translations..."
                , value model.filter
                , onInput FilterChanged
                ]
                []
            ]

        , if model.loading then
            div [ class "flex justify-center p-8" ] [ div [ class "animate-spin rounded-full h-8 w-8 border-b-2 border-primary" ] [] ]
          else
            case model.error of
                Just err ->
                    div [ class "message error" ] [ text err ]

                Nothing ->
                    let
                        filteredTranslations =
                            if String.isEmpty model.filter then
                                model.translations
                            else
                                List.filter (matchesFilter model.filter) model.translations
                    in
                    if String.isEmpty model.filename then
                        if String.isEmpty model.language then
                            -- Show list of available languages (aggregate from counts)
                            let
                                uniqueLangs =
                                    model.counts
                                        |> List.map .language
                                        |> unique
                            in
                            if List.isEmpty uniqueLangs then
                                div [ class "empty-state" ]
                                    [ div [ class "icon" ] [ text "🔍" ]
                                    , h3 [ class "title" ] [ text "No languages found" ]
                                    ]
                            else
                                div [ class "grid gap-4" ]
                                    (List.map (\lang ->
                                        div [ class "card" ]
                                            [ a [ href ("/projects/" ++ model.projectName ++ "/translations/" ++ lang ++ "/editor") ] [ text lang ] ]
                                    ) uniqueLangs)
                        else
                            -- Language selected but no filename: show filenames for this language
                            let
                                filesForLang =
                                    model.counts
                                        |> List.filter (\c -> c.language == model.language)
                                        |> List.map .filename
                                        |> unique
                            in
                            if List.isEmpty filesForLang then
                                div [ class "empty-state" ]
                                    [ div [ class "icon" ] [ text "🔍" ]
                                    , h3 [ class "title" ] [ text "No files found for " ++ model.language ]
                                    ]
                            else
                                div [ class "grid gap-4" ]
                                    (List.map (\fn ->
                                        div [ class "card" ]
                                            [ a [ href ("/projects/" ++ model.projectName ++ "/translations/" ++ model.language ++ "/editor?filename=" ++ fn) ] [ text fn ] ]
                                    ) filesForLang)
                    else
                        if List.isEmpty filteredTranslations then
                            div [ class "empty-state" ]
                                [ div [ class "icon" ] [ text "🔍" ]
                                , h3 [ class "title" ] [ text "No translations found" ]
                                ]
                        else
                            div [ class "grid gap-4" ]
                                (List.map (viewTranslationRow model.saving) filteredTranslations)
        ]

matchesFilter : String -> Translation -> Bool
matchesFilter filter translation =
    let
        lowerFilter = String.toLower filter
    in
    String.contains lowerFilter (String.toLower translation.key) ||
    String.contains lowerFilter (String.toLower translation.sourceValue) ||
    String.contains lowerFilter (String.toLower translation.currentValue)

viewTranslationRow : Maybe String -> Translation -> Html Msg
viewTranslationRow savingKey translation =
    let
        isSaving = savingKey == Just translation.key
    in
    div [ class "card sm grid grid-2 gap-4 items-start" ]
        [ div [ class "flex flex-col gap-2" ]
            [ div [ class "flex items-center gap-2" ]
                [ code [ class "code-chip" ] [ text translation.key ]
                ]
            , p [ class "text-secondary" ] [ text translation.sourceValue ]
            ]
        , div [ class "flex flex-col gap-2" ]
            [ textarea
                [ class "input"
                , rows 2
                , value translation.currentValue
                , onInput (UpdateTranslation translation.key)
                , disabled isSaving
                ]
                []
            , div [ class "flex justify-end" ]
                [ button
                    [ class "btn primary sm"
                    , onClick (SaveTranslation translation.key translation.currentValue)
                    , disabled isSaving
                    ]
                    [ text (if isSaving then "Saving..." else "Save") ]
                ]
            ]
        ]

{-| Return a list with duplicates removed while preserving order -}
unique : List comparable -> List comparable
unique list =
    list
        |> List.foldl
            (\term acc ->
                if List.member term acc then
                    acc
                else
                    term :: acc
            )
            []
        |> List.reverse
