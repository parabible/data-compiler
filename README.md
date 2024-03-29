![Parabible header image](./header.png)

# Data Compiler

As its name suggests, Parabible's Data Compiler compiles module data from a given folder and generates an output sqlite file as well as compressed (zlib) CSVs for ingestion by the Parabible Database Server.

## Usage

To compile the data for yourself, you will need to have a folder that contains all the modules you wish to compile. Each module should be in its own subfolder with no other nesting.

Note that the compiler uses Deno with the sqlite3 package, which requires the `--unstable` flag as well as some other allowances (thus "-A"). See [here](https://deno.land/x/sqlite3@0.9.1#usage).

The compiler may be invoked with the following command:

```
deno run -A --unstable main.ts /path/to/modules
```

## Modules

A module is a text such as a Bible version/translation (this now includes material such as Apostolic Fathers). Modules are defined below:

Modules supply two files at `<module-name>/output/` to be consumed by the importer:

1. A json file with module information in `module.json`
1. A sqlite database called `data.sqlite`.

### `module.json`

The `module.json` file provides module information such as copyright details, etc. An example of the format is taken from the BHS tagged by ETCBC:

```
{
 "abbreviation": "BHSA",
 "name": "Biblia Hebraica Stuttgartensia (Amstelodamensis)",
 "description": "Tagged BHS with linguistic annotations compiled by the ETCBC",
 "corpora": ["OT"],
 "language": "heb",
 "versification_schema": "bhs",
 "license": "Attribution-NonCommercial 4.0 International (<a href='https://creativecommons.org/licenses/by-nc/4.0/'>CC BY-NC 4.0</a>)",
 "url": "http://dx.doi.org/10.17026%2Fdans-z6y-skyh"
}
```

Field | Description
--- | ---
Abbreviation | Short name of the module (e.g. "BHS").
Name | Full name of the module (e.g. "Biblia Hebraica Stuttgartensia").
Description | Short description of the module (including provenance).
Corpora | The corpora included in the module. Available corpora include: `OT`, `NT`, `ApF`.
Language | Language code in ISO 639-2 format.
Versification_schema | The versification schema enables the importer to align verses across modules. Available schemas include: `bhs`, `kjv`, `lxx`.
License | Relevant copyright information.
Url | A link to the source data.

### `data.sqlite`

In the case of the BHS in the `module.json` above, if the root folder for the BHS importer is `hb-bhs-pipe`, the importer expects to find `hb-bhs-pipe/output/data.sqlite`. Every module has a `verse_text` table. Tagged modules also include a `word_features` table.

The schema for `word_features` is as follows:

| field | description |
|---|---|
| wid | The word's id (relative to this module) |
| text | The word as it should be rendered |
| prefix | Any punctuation etc. that precedes the word |
| trailer | Any punctuation etc. that succeeds the word |
| *attribute* | Word attributes that correspond to known "features" (see `validate/features.json`) |
| *syntax*_node | `sentence_node_id`, `clause_node_id`, `phrase_node_id`  |
| rid | Reference id based on the relevant versification system |

Each *attribute* should be listed in features.json

The importer will add an unversioned `parallel_id` based on the versification schema in `module.json`.

The schema for `verse_text` is much simpler:

| field | description |
|---|---|
| rid | Reference id based on the relevant versification system |
| text | JSON string containing a verse text array* |

The importer will add an unversioned `parallel_id` based on the versification schema in `module.json`.

\* Verse text array is in the format:

```ts
type VerseTextArray = {
    wid: integer
    leader: string
    word: string
    trailer: string
}[]
```

### Understanding Versification Schemas

Given a verse in a particular module, we need a way of finding a corresponding verse in some other module. To do this, the importer queries a sqlite database for alignment data to check, first, if there is any module already in the final database that has the matches the current node. If there are any results, the `parallel_id` that is found to be in use for the aligned node is returned. Finding none, the `parallel_id` is assigned as an autoincremented id.
