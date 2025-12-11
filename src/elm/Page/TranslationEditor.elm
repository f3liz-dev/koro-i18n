module Page.TranslationEditor exposing (Model, Msg, init, update, view)

import Api exposing (Translation, TranslationFile)
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (..)
import Http


-- MODEL


type alias Model =
    { projectName : String
    , language : String
    , filename : String
    , translationFile : Maybe TranslationFile
    , loading : Bool
    , error : Maybe String
    , searchQuery : String
    , editingKey : Maybe String
    , editingValue : String
    }


init : String -> String -> String -> ( Model, Cmd Msg )
init projectName language filename =
    ( { projectName = projectName
      , language = language
      , filename = filename
      , translationFile = Nothing
      , loading = True
      , error = Nothing
      , searchQuery = ""
      , editingKey = Nothing
      , editingValue = ""
      }
    , Api.fetchTranslationFile projectName language filename GotTranslationFile
    )


-- UPDATE


type Msg
    = GotTranslationFile (Result Http.Error TranslationFile)
    | SearchChanged String
    | StartEditing String (Maybe String)
    | EditingValueChanged String
    | SaveTranslation
    | CancelEditing
    | SavedTranslation (Result Http.Error ())


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        GotTranslationFile result ->
            case result of
                Ok file ->
                    ( { model | translationFile = Just file, loading = False }, Cmd.none )

                Err _ ->
                    ( { model | loading = False, error = Just "Failed to load translations" }, Cmd.none )

        SearchChanged query ->
            ( { model | searchQuery = query }, Cmd.none )

        StartEditing key currentValue ->
            ( { model | editingKey = Just key, editingValue = Maybe.withDefault "" currentValue }, Cmd.none )

        EditingValueChanged value ->
            ( { model | editingValue = value }, Cmd.none )

        SaveTranslation ->
            case model.editingKey of
                Just key ->
                    ( model
                    , Api.submitTranslation model.projectName model.language key model.editingValue SavedTranslation
                    )

                Nothing ->
                    ( model, Cmd.none )

        CancelEditing ->
            ( { model | editingKey = Nothing, editingValue = "" }, Cmd.none )

        SavedTranslation result ->
            case result of
                Ok () ->
                    ( { model | editingKey = Nothing, editingValue = "" }
                    , Api.fetchTranslationFile model.projectName model.language model.filename GotTranslationFile
                    )

                Err _ ->
                    ( { model | error = Just "Failed to save translation" }, Cmd.none )


-- VIEW


view : Model -> Html Msg
view model =
    div []
        [ viewHeader model
        , if model.loading then
            viewLoading

          else
            case model.translationFile of
                Just file ->
                    viewTranslations model file

                Nothing ->
                    viewError model
        ]


viewHeader : Model -> Html Msg
viewHeader model =
    div [ style "margin-bottom" "2rem" ]
        [ h1 [ style "font-size" "1.75rem", style "margin-bottom" "1rem" ]
            [ text "Translation Editor" ]
        , div [ style "display" "flex", style "gap" "0.5rem", style "flex-wrap" "wrap", style "align-items" "center", style "margin-bottom" "1.5rem" ]
            [ span [ class "badge" ] [ text model.projectName ]
            , span [ class "badge neutral" ] [ text model.language ]
            , span [ class "code-chip" ] [ text model.filename ]
            ]
        , input
            [ type_ "text"
            , class "input"
            , placeholder "Search translations..."
            , value model.searchQuery
            , onInput SearchChanged
            , style "max-width" "24rem"
            ]
            []
        ]


viewTranslations : Model -> TranslationFile -> Html Msg
viewTranslations model file =
    let
        filteredTranslations =
            filterTranslations model.searchQuery file.translations
    in
    div []
        [ div [ style "margin-bottom" "1rem", class "text-sm text-muted" ]
            [ text (String.fromInt (List.length filteredTranslations) ++ " translations")
            , case model.searchQuery of
                "" ->
                    text ""

                _ ->
                    text (" (filtered from " ++ String.fromInt (List.length file.translations) ++ ")")
            ]
        , div [ class "space-y-3" ]
            (List.map (viewTranslationRow model) filteredTranslations)
        ]


filterTranslations : String -> List Translation -> List Translation
filterTranslations query translations =
    if String.isEmpty query then
        translations

    else
        let
            lowerQuery =
                String.toLower query
        in
        List.filter
            (\t ->
                String.contains lowerQuery (String.toLower t.key)
                    || String.contains lowerQuery (String.toLower t.sourceValue)
                    || (case t.targetValue of
                            Just v ->
                                String.contains lowerQuery (String.toLower v)

                            Nothing ->
                                False
                       )
            )
            translations


viewTranslationRow : Model -> Translation -> Html Msg
viewTranslationRow model translation =
    let
        isEditing =
            model.editingKey == Just translation.key
    in
    div [ class "card" ]
        [ div [ style "margin-bottom" "0.75rem" ]
            [ span [ class "code-chip", style "font-size" "0.75rem" ] [ text translation.key ]
            ]
        , div [ class "grid gap-3", style "grid-template-columns" "1fr 1fr" ]
            [ -- Source
              div []
                [ label [ class "label", style "font-size" "0.75rem", style "color" "var(--text-muted)" ]
                    [ text "Source" ]
                , div [ class "panel" ]
                    [ text translation.sourceValue ]
                ]
            , -- Target
              div []
                [ label [ class "label", style "font-size" "0.75rem", style "color" "var(--text-muted)" ]
                    [ text "Translation" ]
                , if isEditing then
                    div []
                        [ textarea
                            [ class "input"
                            , value model.editingValue
                            , onInput EditingValueChanged
                            , rows 3
                            , style "width" "100%"
                            , style "resize" "vertical"
                            ]
                            []
                        , div [ style "margin-top" "0.5rem", style "display" "flex", style "gap" "0.5rem" ]
                            [ button [ onClick SaveTranslation, class "btn primary sm" ]
                                [ text "Save" ]
                            , button [ onClick CancelEditing, class "btn ghost sm" ]
                                [ text "Cancel" ]
                            ]
                        ]

                  else
                    div []
                        [ div
                            [ class "panel"
                            , style "cursor" "pointer"
                            , onClick (StartEditing translation.key translation.targetValue)
                            , style "min-height" "3rem"
                            ]
                            [ case translation.targetValue of
                                Just value ->
                                    text value

                                Nothing ->
                                    span [ class "text-muted", style "font-style" "italic" ]
                                        [ text "Click to add translation..." ]
                            ]
                        ]
                ]
            ]
        , viewTranslationStatus translation.status
        ]


viewTranslationStatus : String -> Html Msg
viewTranslationStatus status =
    let
        ( badgeClass, statusText ) =
            case status of
                "approved" ->
                    ( "badge success", "Approved" )

                "pending" ->
                    ( "badge warning", "Pending Review" )

                "rejected" ->
                    ( "badge danger", "Rejected" )

                _ ->
                    ( "badge neutral", status )
    in
    div [ style "margin-top" "0.75rem" ]
        [ span [ class badgeClass, style "font-size" "0.6875rem" ] [ text statusText ]
        ]


viewLoading : Html Msg
viewLoading =
    div [ class "text-center", style "padding" "3rem" ]
        [ div [ class "animate-pulse", style "color" "var(--text-muted)" ]
            [ text "Loading translations..." ]
        ]


viewError : Model -> Html Msg
viewError model =
    div [ class "card" ]
        [ case model.error of
            Just err ->
                div [ class "message error" ]
                    [ text err ]

            Nothing ->
                text "No translations found"
        ]
