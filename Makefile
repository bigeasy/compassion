# Can't get this to work right now, complaints about JavaScript security. Would
# update to reload the current page if the current page was the correct page,
# rather than look through all tabs for the correct pages.
#
# http://www.finetunedmac.com/forums/ubbthreads.php?ubb=showflat&Number=40638
define SAFARI_REFRESH
tell application "Safari"
set windowList to every window
repeat with aWindow in windowList
	set tabList to every tab of aWindow
	if tabList is not equal to missing value then
		repeat with atab in tabList
			if (URL of atab contains "127.0.0.1:4000") then
			  do shell script "echo 1"
			end if
		end repeat
	end if
end repeat
end tell
endef

#			  tell atab to do javascript "window.location.reload()"

define CHROME_REFRESH
on run keyword
	tell application "Google Chrome"
		set windowList to every window
		repeat with aWindow in windowList
			set tabList to every tab of aWindow
			repeat with atab in tabList
				if (URL of atab contains "127.0.0.1:4000") then
					tell atab to reload
				end if
			end repeat
		end repeat
	end tell
end run
endef

export SAFARI_REFRESH
export CHROME_REFRESH

PATH  := "$(PATH):$(PWD)/node_modules/.bin"
SHELL := env PATH=$(PATH) /bin/sh

javascript := $(filter-out ../_%, $(wildcard ../*.js))
sources := $(patsubst ../%.js,source/%.js.js,$(javascript))
docco := $(patsubst source/%.js.js,docco/%.js.html,$(sources))
pages :=
ifneq (,$(docco))
pages += docco/index.html
endif
outputs := $(docco) css/style.css index.html $(pages)

all: $(outputs)

node_modules/.bin/docco:
	mkdir -p node_modules
	npm install docco@0.7.0
	cd node_modules && patch -p 1 < ../docco.js.patch

node_modules/.bin/serve:
	mkdir -p node_modules
	npm install serve@1.4.0

node_modules/.bin/lessc:
	mkdir -p node_modules
	npm install less

node_modules/.bin/edify:
	mkdir -p node_modules
	npm install less edify edify.pug edify.markdown edify.highlight edify.include edify.ls


# Thoughts on how to capture a child pid.
#
# http://superuser.com/a/1133789
# http://superuser.com/questions/790560/variables-in-gnu-make-recipes-is-that-possible
# http://stackoverflow.com/questions/1909188/define-make-variable-at-rule-execution-time
#
# We serve in the background, then wait on the `make watch` task. The watch task
# will exit if the Makefile is determined to be out of date. Thus, we can bring
# down the background server by touching `Makefile`.
#
# Usage is to run this task in another window, which works well enough for me in
# my `tmux` enviroment. Previously, I was running `make serve` in one window and
# `make watch` in another, and then having to remember to kill before I go.
#
# All of this would probably be alot simpiler, and could really run in the
# background,  if I where to allow myself a few pid files in the build
# directory.
up:
	{ make --no-print-directory serve & } && serve=$$!; \
	make --no-print-directory watch; \
	kill -TERM $$serve;

down:
	touch Makefile

# Would have to redirect too much.
#	$(eval foo=$(shell echo 8))
#	echo -> $(foo)
#	$(eval serve=$(shell bash -c '{ /bin/echo 1 & } && echo $$!'))
#	echo -> $(serve)

watch: all
	fswatch --exclude '.' --include 'Makefile$$' --include '\.pug$$' --include '\.less$$' --include '\.md$$' --include '\.js$$' pages css $(javascript) *.md Makefile | while read line; \
	do \
		echo OUT-OF-DATE: $$line; \
		if [[ $$line == *Makefile ]]; then \
			touch Makefile; \
			exit 0; \
		else \
			make --no-print-directory all < /dev/null; \
			osascript -e "$$CHROME_REFRESH"; \
		fi \
	done;

css/%.css: css/%.less node_modules/.bin/lessc
	node_modules/.bin/lessc $< > $@ || rm -f $@

source/%.js.js: ../%.js
	mkdir -p source
	cp $< $@

$(docco): $(sources) node_modules/.bin/docco
	mkdir -p docco
	node_modules/.bin/docco -o docco -c docco.css source/*.js.js
	sed -i '' -e 's/[ \t]*$$//' docco/*.js.html
	sed -i '' -e 's/\.js\.js/.js/' docco/*.js.html

index.html: index.md

ifneq (,$(docco))
docco/index.html: docco.pug $(docco)
	node node_modules/.bin/edify pug $$(node_modules/.bin/edify ls docco) < $< > $@
endif

%.html: pages/%.pug node_modules/.bin/edify
	@echo generating $@
	@(node node_modules/.bin/edify pug | \
		node_modules/.bin/edify include --select '.include' --type text | \
	    node node_modules/.bin/edify markdown --select '.markdown' | \
	    node node_modules/.bin/edify highlight --select '.lang-javascript' --language 'javascript') < $< > $@

clean:
	rm -f $(outputs) $(pages)

serve: node_modules/.bin/serve all
	node_modules/.bin/serve --no-less --port 4000

.INTERMEDIATE: $(sources)
